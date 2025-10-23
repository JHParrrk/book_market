// book_market/routes/carts.js
const express = require("express");
const router = express.Router();
const cartController = require("../modules/carts/cart.controller");
const { authenticateJWT } = require("../middleware/authorize.middleware");

// 장바구니 상품 추가
router.post("/", authenticateJWT, cartController.addToCart);

// 장바구니 목록 조회
router.get("/", authenticateJWT, cartController.getCartItems);

// 장바구니 상품 수량 변경
router.put("/:cartItemId", authenticateJWT, cartController.updateCartItem);

// 장바구니 상품 삭제
router.delete("/:cartItemId", authenticateJWT, cartController.removeCartItem);

module.exports = router;
