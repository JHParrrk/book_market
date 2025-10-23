const dbPool = require("../../database/connection/mariaDB");
const { CustomError } = require("../../utils/errorHandler.util");
const { NOT_FOUND } = require("../../constants/errors");
const { ORDER_STATUS } = require("../../constants/orderStatus.js");

/**
 * 사용자의 장바구니에서 주문할 상품 정보를 조회 (소유권 검증 포함)
 */
const findCartItemsForOrder = async (conn, userId, cartItemIds) => {
  const sql = `
    SELECT c.book_id, c.quantity, b.price 
    FROM carts c 
    JOIN books b ON c.book_id = b.id 
    WHERE c.user_id = ? AND c.id IN (?) AND b.deleted_at IS NULL`;
  const [items] = await conn.query(sql, [userId, cartItemIds]);

  // [개선] CustomError 사용
  if (items.length !== cartItemIds.length) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "주문하려는 상품 중 일부가 장바구니에 없거나 품절되었습니다."
    );
  }
  return items;
};

/**
 * [신규] 주문 상세 정보를 bulk insert
 */
const insertOrderDetails = (conn, orderId, items) => {
  const sql = `INSERT INTO order_details (order_id, book_id, quantity, price) VALUES ?`;
  const values = items.map((item) => [
    orderId,
    item.book_id,
    item.quantity,
    item.price,
  ]);
  return conn.query(sql, [values]);
};

// 트랜잭션 처리
exports.create = async ({ userId, delivery_info, cart_item_ids }) => {
  const conn = await dbPool.getConnection();
  try {
    // 트랜잭션 시작
    await conn.beginTransaction();

    const itemsToOrder = await findCartItemsForOrder(
      conn,
      userId,
      cart_item_ids
    );
    if (itemsToOrder.length === 0) {
      throw new CustomError(
        NOT_FOUND.statusCode,
        "주문할 상품이 장바구니에 없습니다."
      );
    }

    const totalPrice = itemsToOrder.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // [개선] 매직 스트링 대신 상수 사용
    const orderSql = `INSERT INTO orders (user_id, delivery_info, total_price, status) VALUES (?, ?, ?, ?)`;
    const [orderResult] = await conn.query(orderSql, [
      userId,
      JSON.stringify(delivery_info),
      totalPrice,
      ORDER_STATUS.PAYMENT_PENDING, // "결제대기" -> 상수
    ]);
    const orderId = orderResult.insertId;

    await insertOrderDetails(conn, orderId, itemsToOrder);

    const deleteCartSql = `DELETE FROM carts WHERE user_id = ? AND id IN (?)`;
    await conn.query(deleteCartSql, [userId, cart_item_ids]);

    // 트랜잭션 커밋
    await conn.commit();
    return { order_id: orderId, message: "주문이 성공적으로 완료되었습니다." };
  } catch (err) {
    // 트랜잭션 롤백
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.findByUserId = async (userId) => {
  const sql = `SELECT id as order_id, total_price, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC`;
  const [orders] = await dbPool.query(sql, [userId]);
  return orders;
};

/**
 * [개선] 주문 상세 정보를 한 번의 쿼리로 조회하도록 최적화
 */
exports.findOrderDetailsById = async (orderId) => {
  const sql = `
    SELECT 
        o.id, o.user_id, o.delivery_info, o.total_price, o.status, o.created_at,
        od.book_id, b.title, od.quantity, od.price as price_at_order
    FROM orders o
    JOIN order_details od ON o.id = od.order_id
    JOIN books b ON od.book_id = b.id
    WHERE o.id = ?`;
  const [results] = await dbPool.query(sql, [orderId]);

  if (results.length === 0) {
    return null;
  }

  // 쿼리 결과를 기반으로 주문 객체 재구성
  const order = {
    id: results[0].id,
    user_id: results[0].user_id,
    delivery_info: JSON.parse(results[0].delivery_info),
    total_price: results[0].total_price,
    status: results[0].status,
    created_at: results[0].created_at,
    books: results.map((row) => ({
      book_id: row.book_id,
      title: row.title,
      quantity: row.quantity,
      price: row.price_at_order,
    })),
  };

  return order;
};

/**
 * [신규] 특정 주문의 상태를 업데이트하는 함수
 * @returns {Promise<number>} 영향을 받은 행의 수
 */
exports.updateOrderStatus = async (orderId, status) => {
  const sql = "UPDATE orders SET status = ? WHERE id = ?";
  const [result] = await dbPool.query(sql, [status, orderId]);
  return result.affectedRows;
};
