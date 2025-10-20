const dbPool = require("../../database/connection/mariaDB");

exports.checkPurchaseHistory = async (userId, bookId) => {
  const sql = `
    SELECT 1 FROM orders o
    JOIN order_details od ON o.id = od.order_id
    WHERE o.user_id = ? AND od.book_id = ?
    LIMIT 1`;
  const [result] = await dbPool.query(sql, [userId, bookId]);
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

exports.update = ({ reviewId, content, rating }) => {
  const sql = "UPDATE reviews SET content = ?, rating = ? WHERE id = ?";
  return dbPool.query(sql, [content, rating, reviewId]);
};

exports.delete = (reviewId) => {
  const sql = "DELETE FROM reviews WHERE id = ?";
  return dbPool.query(sql, [reviewId]);
};
