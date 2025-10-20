const bookRepository = require("./book.repository.js");
const { NOT_FOUND } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

// [수정] 도서 검색 로직
exports.searchBooks = (filters) => bookRepository.searchBooks(filters);

// [신규] 신간 도서 조회 로직
exports.getNewBooks = (filters) => bookRepository.findNewBooks(filters);

// [신규] 도서 총 개수 조회 로직
exports.getBooksCount = (filters) => bookRepository.countBooks(filters);

// [수정] 도서 상세 조회 (books와 book_details를 모두 조회)
exports.getBookById = async (bookId, userId) => {
  const book = await bookRepository.findBookWithDetailById(bookId, userId);
  if (!book) {
    throw new CustomError(NOT_FOUND.statusCode, "도서를 찾을 수 없습니다.");
  }
  return book;
};

exports.toggleBookLike = (bookId, userId) =>
  bookRepository.toggleLike(bookId, userId);
