const express = require("express");
const router = express.Router();
const reviewController = require("../modules/reviews/review.controller");
const { authenticateJWT } = require("../middleware/authorize.middleware");

// 도서 리뷰 작성
router.post("/:bookId/reviews", authenticateJWT, reviewController.addReview);

// 리뷰 수정
router.put("/:reviewId", authenticateJWT, reviewController.updateReview);

// 리뷰 삭제
router.delete("/:reviewId", authenticateJWT, reviewController.deleteReview);

module.exports = router;
