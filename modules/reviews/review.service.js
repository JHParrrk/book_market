const reviewRepository = require("./review.repository");
const { FORBIDDEN } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

// [신규] 도서별 리뷰 목록 조회
exports.getReviewsByBook = (params) =>
  reviewRepository.findReviewsByBookId(params);

exports.addReview = async (reviewData) => {
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

  const result = await reviewRepository.create(reviewData);
  // [고도화] 리뷰 추가 후 도서의 평균 평점 업데이트
  await reviewRepository.updateBookRating(reviewData.bookId);
  return result;
};

exports.updateReview = async (reviewData) => {
  const review = await reviewRepository.findById(reviewData.reviewId);
  if (!review) {
    throw new CustomError(404, "리뷰를 찾을 수 없습니다.");
  }
  if (review.user_id !== reviewData.userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신이 작성한 리뷰만 수정할 수 있습니다."
    );
  }
  await reviewRepository.update(reviewData);
  // [고도화] 리뷰 수정 후 도서의 평균 평점 업데이트
  await reviewRepository.updateBookRating(review.book_id);
};

// [수정] 관리자 삭제 권한 추가
exports.deleteReview = async (reviewId, user) => {
  const review = await reviewRepository.findById(reviewId);
  if (!review) {
    // 삭제하려는 리뷰가 없으면 그냥 성공 처리
    return;
  }

  // 리뷰 작성자도 아니고, 관리자도 아니면 권한 없음
  if (review.user_id !== user.id && user.role !== "admin") {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "리뷰를 삭제할 권한이 없습니다."
    );
  }

  await reviewRepository.delete(reviewId);
  // [고도화] 리뷰 삭제 후 도서의 평균 평점 업데이트
  await reviewRepository.updateBookRating(review.book_id);
};

// [신규] 리뷰 좋아요 토글
exports.toggleReviewLike = (reviewId, userId) =>
  reviewRepository.toggleLike(reviewId, userId);
