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
  const { bookId, reviewId, userId, content, rating } = reviewData;
  const review = await reviewRepository.findById(reviewId);

  if (!review) {
    throw new CustomError(404, "리뷰를 찾을 수 없습니다.");
  }
  // [보안 강화] URL로 받은 bookId와 DB의 book_id가 일치하는지 검증
  if (review.book_id !== parseInt(bookId, 10)) {
    throw new CustomError(404, "해당 도서에 존재하지 않는 리뷰입니다.");
  }
  if (review.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신이 작성한 리뷰만 수정할 수 있습니다."
    );
  }

  // update 함수에는 필요한 데이터만 전달
  await reviewRepository.update({ reviewId, content, rating });
  await reviewRepository.updateBookRating(review.book_id);
};

// [수정] 관리자 삭제 권한 추가
exports.deleteReview = async ({ bookId, reviewId, user }) => {
  const review = await reviewRepository.findById(reviewId);

  if (!review) return; // 리뷰가 없으면 조용히 종료

  // [보안 강화] URL로 받은 bookId와 DB의 book_id가 일치하는지 검증
  if (review.book_id !== parseInt(bookId, 10)) {
    throw new CustomError(404, "해당 도서에 존재하지 않는 리뷰입니다.");
  }
  // 관리자 또는 리뷰 작성자만 삭제 가능
  if (review.user_id !== user.id && user.role !== "admin") {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "리뷰를 삭제할 권한이 없습니다."
    );
  }

  await reviewRepository.delete(reviewId);
  await reviewRepository.updateBookRating(review.book_id);
};
// [신규] 리뷰 좋아요 토글
exports.toggleReviewLike = (reviewId, userId) =>
  reviewRepository.toggleLike(reviewId, userId);
