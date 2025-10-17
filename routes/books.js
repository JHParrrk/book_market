const express = require("express");
const router = express.Router();
const bookController = require("../modules/books/book.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");
const validate = require("../middleware/validator.middleware");

// 도서 목록 조회
router.get("/", bookController.getBooks);

// 도서 상세 조회
router.get("/:bookId", bookController.getBookById);

// 도서 좋아요 추가/취소
router.post("/:bookId/like", authenticateJWT, bookController.toggleBookLike);

// 도서별 리뷰 목록 조회
router.get("/:bookId/reviews", bookController.getBookReviews);

module.exports = router;
