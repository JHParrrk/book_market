const bookRepository = require("./book.repository");
const { NOT_FOUND } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.getBooks = (filters) => bookRepository.findBooks(filters);

exports.getBookById = async (bookId, userId) => {
  const book = await bookRepository.findBookById(bookId, userId);
  if (!book) {
    throw new CustomError(NOT_FOUND.statusCode, "도서를 찾을 수 없습니다.");
  }
  return book;
};

exports.toggleBookLike = (bookId, userId) =>
  bookRepository.toggleLike(bookId, userId);

exports.getBookReviews = (bookId) => bookRepository.findReviewsByBookId(bookId);
