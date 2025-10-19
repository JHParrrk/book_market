const bookService = require("./book.service");
const { CustomError } = require("../../utils/errorHandler.util");

// 도서 목록 조회
exports.getBooks = async (req, res, next) => {
  try {
    const { category_id, new: isNew, page, limit } = req.query;
    const { books, pagination } = await bookService.getBooks({
      category_id,
      isNew,
      page,
      limit,
    });
    res.status(200).json({ books, pagination });
  } catch (err) {
    next(err);
  }
};

// 도서 상세 조회
exports.getBookById = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user ? req.user.id : null; // 인증된 사용자인 경우 userId 전달
    const book = await bookService.getBookById(bookId, userId);
    res.status(200).json(book);
  } catch (err) {
    next(err);
  }
};

// 도서 '좋아요' 추가/취소
exports.toggleBookLike = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const result = await bookService.toggleBookLike(bookId, userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// 도서별 리뷰 목록 조회 (reviews 모듈과 중복될 수 있으나, books 라우트에 명시되어 있어 추가)
exports.getBookReviews = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const reviews = await bookService.getBookReviews(bookId);
    res.status(200).json(reviews);
  } catch (err) {
    next(err);
  }
};
