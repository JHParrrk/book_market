const orderRepository = require("./order.repository");
const { NOT_FOUND, FORBIDDEN } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.createOrder = async ({
  userId,
  delivery_info,
  cart_item_ids,
  use_default_address,
  currentUser,
}) => {
  let finalDeliveryInfo = delivery_info;

  // [개선] currentUser 정보를 활용하여 userRepository 의존성 제거
  if (use_default_address) {
    if (!currentUser || !currentUser.address) {
      throw new CustomError(
        NOT_FOUND.statusCode,
        "기본 배송지로 설정된 주소가 없습니다."
      );
    }
    finalDeliveryInfo = {
      recipient: currentUser.name,
      address: currentUser.address,
      phone: currentUser.phone_number,
    };
  }

  // [핵심 개선] 주문 생성 시, 현재 사용자의 ID를 함께 전달하여 권한 검증
  return orderRepository.create({
    userId,
    delivery_info: finalDeliveryInfo,
    cart_item_ids,
  });
};

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

/**
 * [신규] 주문 상태 변경 서비스
 */
exports.updateOrderStatus = async ({ orderId, status }) => {
  const affectedRows = await orderRepository.updateOrderStatus(orderId, status);

  // 업데이트된 행이 0개이면, 해당 주문 ID가 존재하지 않는다는 의미입니다.
  if (affectedRows === 0) {
    throw new CustomError(NOT_FOUND.statusCode, "주문을 찾을 수 없습니다.");
  }
};
