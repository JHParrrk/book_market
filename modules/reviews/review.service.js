const reviewRepository = require("./review.repository");
const { FORBIDDEN, BAD_REQUEST } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.addReview = async (reviewData) => {
  // 도서 구매 이력 확인 로직
  const hasPurchased = await reviewRepository.checkPurchaseHistory(
    reviewData.userId,
    reviewData.bookId
  );
  if (!hasPurchased) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "도서를 구매한 사용자만 리뷰를 작성할 수 있습니다."
    );
  }
  return reviewRepository.create(reviewData);
};

exports.updateReview = async (reviewData) => {
  const review = await reviewRepository.findById(reviewData.reviewId);
  if (review && review.user_id !== reviewData.userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신이 작성한 리뷰만 수정할 수 있습니다."
    );
  }
  return reviewRepository.update(reviewData);
};

exports.deleteReview = async (reviewId, userId) => {
  const review = await reviewRepository.findById(reviewId);
  if (review && review.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신이 작성한 리뷰만 삭제할 수 있습니다."
    );
  }
  return reviewRepository.delete(reviewId);
};
