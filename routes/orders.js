const express = require("express");
const router = express.Router();
const orderController = require("../modules/orders/order.controller");
const { authenticateJWT } = require("../middleware/authorize.middleware");
const { authorizeAdmin } = require("../middleware/authorizeAdmin.middleware");

// 새로운 주문 생성
router.post("/", authenticateJWT, orderController.createOrder);

// 내 주문 목록 조회
router.get("/", authenticateJWT, orderController.getMyOrders);

// 주문 상세 조회
router.get("/:orderId", authenticateJWT, orderController.getOrderById);

// [신규] 주문 상태 변경 (관리자용)
// authenticateJWT -> authorizeAdmin 순서로 미들웨어를 실행합니다.
router.put(
  "/:orderId/status",
  authenticateJWT,
  authorizeAdmin,
  orderController.updateOrderStatus
);

module.exports = router;
