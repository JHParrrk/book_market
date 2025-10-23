// book.service.js

const bookRepository = require("./book.repository.js");
const { NOT_FOUND } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

// [수정] 도서 검색 로직
exports.searchBooks = (filters) => bookRepository.searchBooks(filters);

// [신규] 신간 도서 조회 로직
exports.getNewBooks = (filters) => bookRepository.findNewBooks(filters);

// [신규] 도서 총 개수 조회 로직
exports.getBooksCount = (filters) => bookRepository.countBooks(filters);

// [수정] 도서 상세 조회 및 에러 처리 개선
exports.getBookById = async (bookId, userId) => {
  const book = await bookRepository.findBookWithDetailById(bookId, userId);
  if (!book) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      `해당 ID(${bookId})의 도서를 찾을 수 없습니다.`
    );
  }
  return book;
};

exports.toggleBookLike = (bookId, userId) =>
  bookRepository.toggleLike(bookId, userId);
