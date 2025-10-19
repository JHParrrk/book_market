const dbPool = require("../../database/connection/mariaDB");

exports.findBooks = async ({ category_id, isNew, page = 1, limit = 10 }) => {
  let sql = `SELECT id, title, author, image_url, price, summary FROM books WHERE deleted_at IS NULL`;
  const params = [];

  if (category_id) {
    sql += ` AND category_id = ?`;
    params.push(category_id);
  }
  if (isNew === "true") {
    sql += ` AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
  }

  // 페이지네이션을 위한 전체 개수 조회
  const countSql = sql.replace(
    "SELECT id, title, author, image_url, price, summary",
    "SELECT COUNT(*) as count"
  );
  const [countResult] = await dbPool.query(countSql, params);
  const totalBooks = countResult[0].count;
  const totalPages = Math.ceil(totalBooks / limit);

  // 실제 데이터 조회
  const offset = (page - 1) * limit;
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [books] = await dbPool.query(sql, params);

  return {
    books,
    pagination: { currentPage: parseInt(page), totalPages },
  };
};

exports.findBookById = async (bookId, userId) => {
  const sql = `
    SELECT b.*, c.name AS category_name, 
           EXISTS(SELECT 1 FROM book_likes bl WHERE bl.book_id = b.id AND bl.user_id = ?) AS isLiked
    FROM books b
    JOIN categories c ON b.category_id = c.id
    WHERE b.id = ? AND b.deleted_at IS NULL`;
  const [result] = await dbPool.query(sql, [userId, bookId]);
  return result[0];
};

exports.toggleLike = async (bookId, userId) => {
  const checkSql = "SELECT * FROM book_likes WHERE user_id = ? AND book_id = ?";
  const [existing] = await dbPool.query(checkSql, [userId, bookId]);

  if (existing.length > 0) {
    // 좋아요 취소
    const deleteSql =
      "DELETE FROM book_likes WHERE user_id = ? AND book_id = ?";
    await dbPool.query(deleteSql, [userId, bookId]);
    return { isLiked: false };
  } else {
    // 좋아요 추가
    const insertSql = "INSERT INTO book_likes (user_id, book_id) VALUES (?, ?)";
    await dbPool.query(insertSql, [userId, bookId]);
    return { isLiked: true };
  }
};

exports.findReviewsByBookId = async (bookId) => {
  const sql = `
    SELECT r.id, SUBSTRING(u.name, 1, 1) as userName, r.content, r.rating, r.created_at
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.book_id = ?`;
  const [reviews] = await dbPool.query(sql, [bookId]);
  return reviews;
};
