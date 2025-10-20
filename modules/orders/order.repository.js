const dbPool = require("../../database/connection/mariaDB");

// 트랜잭션 처리가 필요한 복잡한 로직
exports.create = async ({ userId, delivery_info, cart_item_ids }) => {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 장바구니에서 주문할 상품 정보 조회
    const cartSql = `SELECT book_id, quantity, price FROM carts c JOIN books b ON c.book_id = b.id WHERE c.id IN (?)`;
    const [itemsToOrder] = await conn.query(cartSql, [cart_item_ids]);

    // 2. 총 가격 계산
    const totalPrice = itemsToOrder.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // 3. orders 테이블에 주문 생성
    const orderSql = `INSERT INTO orders (user_id, delivery_info, total_price, status) VALUES (?, ?, ?, ?)`;
    const [orderResult] = await conn.query(orderSql, [
      userId,
      JSON.stringify(delivery_info),
      totalPrice,
      "결제완료",
    ]);
    const orderId = orderResult.insertId;

    // 4. order_details 테이블에 주문 상품 상세 정보 저장
    const orderDetailsSql = `INSERT INTO order_details (order_id, book_id, quantity, price) VALUES ?`;
    const orderDetailsValues = itemsToOrder.map((item) => [
      orderId,
      item.book_id,
      item.quantity,
      item.price,
    ]);
    await conn.query(orderDetailsSql, [orderDetailsValues]);

    // 5. 장바구니에서 주문한 상품 삭제
    const deleteCartSql = `DELETE FROM carts WHERE id IN (?)`;
    await conn.query(deleteCartSql, [cart_item_ids]);

    await conn.commit();
    return { order_id: orderId, message: "주문이 성공적으로 완료되었습니다." };
  } catch (err) {
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

exports.findOrderDetailsById = async (orderId) => {
  const orderSql = `SELECT * FROM orders WHERE id = ?`;
  const [orderResult] = await dbPool.query(orderSql, [orderId]);
  const order = orderResult[0];

  if (!order) return null;

  const detailsSql = `SELECT od.book_id, b.title, od.quantity, od.price FROM order_details od JOIN books b ON od.book_id = b.id WHERE od.order_id = ?`;
  const [details] = await dbPool.query(detailsSql, [orderId]);

  order.delivery_info = JSON.parse(order.delivery_info);
  order.books = details;
  return order;
};
