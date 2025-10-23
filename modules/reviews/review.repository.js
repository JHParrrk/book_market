const dbPool = require("../../database/connection/mariaDB");
const { ORDER_STATUS } = require("../../constants/orderStatus");

// [신규] 도서별 리뷰 목록 조회 (좋아요 수, 좋아요 여부 포함)
exports.findReviewsByBookId = async ({ bookId, userId, page, limit }) => {
  const offset = (page - 1) * limit;
  const sql = `
    SELECT 
        r.id, r.content, r.rating, r.created_at,
        u.name AS author_name,
        (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) AS likes_count,
        EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = ?) AS is_liked
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [reviews] = await dbPool.query(sql, [userId, bookId, limit, offset]);
  return reviews;
};

// [신규] 리뷰 좋아요 토글
exports.toggleLike = async (reviewId, userId) => {
  const checkSql =
    "SELECT * FROM review_likes WHERE user_id = ? AND review_id = ?";
  const [existing] = await dbPool.query(checkSql, [userId, reviewId]);

  if (existing.length > 0) {
    const deleteSql =
      "DELETE FROM review_likes WHERE user_id = ? AND review_id = ?";
    await dbPool.query(deleteSql, [userId, reviewId]);
    return { isLiked: false };
  } else {
    const insertSql =
      "INSERT INTO review_likes (user_id, review_id) VALUES (?, ?)";
    await dbPool.query(insertSql, [userId, reviewId]);
    return { isLiked: true };
  }
};

// [신규/고도화] 도서의 평균 평점 및 리뷰 수 업데이트
exports.updateBookRating = async (bookId) => {
  const ratingSql = `
    SELECT 
        AVG(rating) AS average_rating,
        COUNT(id) AS review_count
    FROM reviews
    WHERE book_id = ?
  `;
  const [result] = await dbPool.query(ratingSql, [bookId]);
  const { average_rating, review_count } = result[0];

  const updateSql = `
    UPDATE books
    SET average_rating = ?, review_count = ?
    WHERE id = ?
  `;
  await dbPool.query(updateSql, [
    average_rating || 0,
    review_count || 0,
    bookId,
  ]);
};

// --- 기존 함수들 ---
exports.checkPurchaseHistory = async (userId, bookId) => {
  const sql = `
    SELECT 1 FROM orders o
    JOIN order_details od ON o.id = od.order_id
    WHERE o.user_id = ? AND od.book_id = ? AND o.status = ?
    LIMIT 1`;
  const [result] = await dbPool.query(sql, [
    userId,
    bookId,
    ORDER_STATUS.DELIVERED,
  ]);
  return result.length > 0;
};

exports.create = async ({ userId, bookId, content, rating }) => {
  const sql = `INSERT INTO reviews (user_id, book_id, content, rating) VALUES (?, ?, ?, ?)`;
  const [result] = await dbPool.query(sql, [userId, bookId, content, rating]);
  return {
    review_id: result.insertId,
    message: "리뷰가 성공적으로 등록되었습니다.",
  };
};

exports.findById = async (reviewId) => {
  const [review] = await dbPool.query("SELECT * FROM reviews WHERE id = ?", [
    reviewId,
  ]);
  return review[0];
};

// [수정] 매개변수 구조 분해 방식을 변경하여 안정성 확보
exports.update = (reviewData) => {
  const { reviewId, content, rating } = reviewData;

  // 디버깅용 로그: 전달된 값을 확인합니다.
  console.log("Repository received:", { reviewId, content, rating });

  if (rating === undefined || rating === null) {
    // rating 값이 없는 경우 에러를 던져서 문제를 조기에 파악합니다.
    throw new Error("Rating value is missing in repository update function.");
  }

  const sql = "UPDATE reviews SET content = ?, rating = ? WHERE id = ?";
  return dbPool.query(sql, [content, rating, reviewId]);
};
exports.delete = (reviewId) => {
  const sql = "DELETE FROM reviews WHERE id = ?";
  return dbPool.query(sql, [reviewId]);
};
