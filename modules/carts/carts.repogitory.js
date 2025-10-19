const dbPool = require("../../database/connection/mariaDB");

exports.upsertCartItem = ({ userId, book_id, quantity }) => {
  const sql = `
    INSERT INTO carts (user_id, book_id, quantity) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`;
  return dbPool.query(sql, [userId, book_id, quantity]);
};

exports.findCartItemsByUserId = async (userId) => {
  const sql = `
    SELECT c.id as cart_id, c.book_id, b.title, b.price, c.quantity
    FROM carts c
    JOIN books b ON c.book_id = b.id
    WHERE c.user_id = ? AND b.deleted_at IS NULL`;
  const [items] = await dbPool.query(sql, [userId]);
  return items;
};

exports.findCartItemById = async (cartItemId) => {
  const [item] = await dbPool.query("SELECT * FROM carts WHERE id = ?", [
    cartItemId,
  ]);
  return item[0];
};

exports.updateCartItemQuantity = (cartItemId, quantity) => {
  const sql = "UPDATE carts SET quantity = ? WHERE id = ?";
  return dbPool.query(sql, [quantity, cartItemId]);
};

exports.deleteCartItem = (cartItemId) => {
  const sql = "DELETE FROM carts WHERE id = ?";
  return dbPool.query(sql, [cartItemId]);
};
