const orderRepository = require("./order.repository");
const { FORBIDDEN } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.createOrder = (orderData) => orderRepository.create(orderData);

exports.getOrdersByUserId = (userId) => orderRepository.findByUserId(userId);

exports.getOrderDetails = async ({ orderId, userId }) => {
  const order = await orderRepository.findOrderDetailsById(orderId);
  // 본인 주문인지 확인
  if (order && order.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신의 주문만 조회할 수 있습니다."
    );
  }
  return order;
};
