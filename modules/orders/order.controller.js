const orderService = require("./order.service");
const { CustomError } = require("../../utils/errorHandler.util");
const { BAD_REQUEST } = require("../../constants/errors");

exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { delivery_info, cart_item_ids, use_default_address } = req.body;

    // [개선] 입력값 검증 강화 및 CustomError 사용
    if (!use_default_address && !delivery_info) {
      throw new CustomError(
        BAD_REQUEST.statusCode,
        "배송지 정보가 필요합니다."
      );
    }
    if (
      !cart_item_ids ||
      !Array.isArray(cart_item_ids) ||
      cart_item_ids.length === 0
    ) {
      throw new CustomError(
        BAD_REQUEST.statusCode,
        "주문할 상품을 선택해주세요."
      );
    }
    const result = await orderService.createOrder({
      userId,
      delivery_info,
      cart_item_ids,
      use_default_address,
      // [개선] 현재 사용자 정보를 서비스 계층으로 전달
      currentUser: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orders = await orderService.getOrdersByUserId(userId);
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const order = await orderService.getOrderDetails({ orderId, userId });
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};

/**
 * [신규] 주문 상태 변경 핸들러
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // 1. 입력값 검증: 요청된 상태가 우리가 정의한 상태 목록에 있는지 확인합니다.
    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new CustomError(
        BAD_REQUEST.statusCode,
        "유효하지 않은 주문 상태입니다."
      );
    }

    // 2. 권한 검증 (주석 처리): 실제 운영 시에는 관리자만 접근 가능하도록 해야 합니다.
    // if (req.user.role !== 'admin') {
    //   throw new CustomError(FORBIDDEN.statusCode, "주문 상태를 변경할 권한이 없습니다.");
    // }

    await orderService.updateOrderStatus({ orderId, status });

    res.status(200).json({ message: "주문 상태가 성공적으로 변경되었습니다." });
  } catch (err) {
    next(err);
  }
};
