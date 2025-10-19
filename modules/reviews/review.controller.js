const reviewService = require("./review.service");

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
    const userId = req.user.id;
    await reviewService.deleteReview(reviewId, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
