const bookService = require("./book.service");

// [수정] 도서 검색 (기존 getBooks 대체)
exports.searchBooks = async (req, res, next) => {
  try {
    const { category_id, keyword, page = 1, limit = 10 } = req.query;
    const { books, pagination } = await bookService.searchBooks({
      category_id,
      keyword,
      page,
      limit,
    });
    res.status(200).json({ books, pagination });
  } catch (err) {
    next(err);
  }
};

// [신규] 신간 도서 조회
exports.getNewBooks = async (req, res, next) => {
  try {
    const { category_id } = req.query;
    const books = await bookService.getNewBooks({ category_id });
    res.status(200).json({ books });
  } catch (err) {
    next(err);
  }
};

// [신규] 도서 검색 결과 총 개수 조회 (페이지네이션용)
exports.getBooksCount = async (req, res, next) => {
  try {
    const { category_id, keyword } = req.query;
    const totalCount = await bookService.getBooksCount({
      category_id,
      keyword,
    });
    res.status(200).json({ totalCount });
  } catch (err) {
    next(err);
  }
};

// 도서 상세 조회 (DB 분리에 따라 Service/Repository 수정 필요)
exports.getBookById = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user ? req.user.id : null;
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
