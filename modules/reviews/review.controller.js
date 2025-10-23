const reviewService = require("./review.service");
const safeParseInt = require("../../utils/safeParseInt");

// [신규] 도서별 리뷰 목록 조회
exports.getReviewsByBook = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user ? req.user.id : null; // 비로그인 사용자를 위한 처리
    const page = safeParseInt(req.query.page, 1);
    const limit = safeParseInt(req.query.limit, 5);

    const reviews = await reviewService.getReviewsByBook({
      bookId,
      userId,
      page,
      limit,
    });
    res.status(200).json(reviews);
  } catch (err) {
    next(err);
  }
};

exports.addReview = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const { content, rating } = req.body;
    const result = await reviewService.addReview({
      userId,
      bookId,
      content,
      rating,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { content, rating } = req.body;
    await reviewService.updateReview({ reviewId, userId, content, rating });
    res.status(200).json({ message: "리뷰가 성공적으로 수정되었습니다." });
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    // [수정] 권한 확인을 위해 user 객체 전체를 전달
    await reviewService.deleteReview(reviewId, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// [신규] 리뷰 좋아요 토글
exports.toggleReviewLike = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const result = await reviewService.toggleReviewLike(reviewId, userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
