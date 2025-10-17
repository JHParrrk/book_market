const express = require("express");
const router = express.Router();
const orderController = require("../modules/orders/order.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");

// 새로운 주문 생성
router.post("/", authenticateJWT, orderController.createOrder);

// 내 주문 목록 조회
router.get("/", authenticateJWT, orderController.getMyOrders);

// 주문 상세 조회
router.get("/:orderId", authenticateJWT, orderController.getOrderById);

module.exports = router;
