// book_market/modules/carts/cart.repository.js

const dbPool = require("../../database/connection/mariaDB");

exports.upsertCartItem = ({ userId, book_id, quantity }) => {
  const sql = `
    INSERT INTO carts (user_id, book_id, quantity) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`;

  // [수정] VALUES(quantity)가 참조할 수 있도록 quantity를 한 번 더 전달합니다.
  return dbPool.query(sql, [userId, book_id, quantity, quantity]);
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

// exports.findCartItemById = async (cartItemId) => {
//   const [item] = await dbPool.query("SELECT * FROM carts WHERE id = ?", [
//     cartItemId,
//   ]);
//   return item[0];
// };
// 더이상 사용하지 않음. 서비스 레이어에서 소유권 검증을 위해
// userId도 함께 전달받아야 하므로 아래와 같이 수정.

/**
 * [개선] user_id 조건을 추가하여 본인의 장바구니 상품만 수정하도록 보장합니다.
 * @returns {Promise<number>} 영향을 받은 행의 수
 */
exports.updateCartItemQuantity = async (cartItemId, quantity, userId) => {
  const sql = "UPDATE carts SET quantity = ? WHERE id = ? AND user_id = ?";
  const [result] = await dbPool.query(sql, [quantity, cartItemId, userId]);
  return result.affectedRows;
};

/**
 * [개선] user_id 조건을 추가하여 본인의 장바구니 상품만 삭제하도록 보장합니다.
 * @returns {Promise<number>} 영향을 받은 행의 수
 */
exports.deleteCartItem = async (cartItemId, userId) => {
  const sql = "DELETE FROM carts WHERE id = ? AND user_id = ?";
  const [result] = await dbPool.query(sql, [cartItemId, userId]);
  return result.affectedRows;
};
