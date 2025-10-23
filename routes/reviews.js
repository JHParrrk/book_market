const express = require("express");
const router = express.Router();
const reviewController = require("../modules/reviews/review.controller");
const { authenticateJWT } = require("../middleware/authorize.middleware");

// 리뷰 수정 (로그인 필수)
router.put("/:reviewId", authenticateJWT, reviewController.updateReview);

// 리뷰 삭제 (로그인 필수)
router.delete("/:reviewId", authenticateJWT, reviewController.deleteReview);

// [신규] 리뷰 좋아요 토글 (로그인 필수)
router.post(
  "/:reviewId/like",
  authenticateJWT,
  reviewController.toggleReviewLike
);

module.exports = router;
