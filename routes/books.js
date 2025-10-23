const express = require("express");
const router = express.Router();
const bookController = require("../modules/books/book.controller");
const { authenticateJWT } = require("../middleware/authorize.middleware");

// [신규] 도서 검색 (검색어와 카테고리를 기반으로 도서 목록 조회)
router.get("/search", bookController.searchBooks);

// [신규] 신간 도서 조회 (카테고리 기반으로 4개의 신간 출력)
router.get("/new", bookController.getNewBooks);

// [신규] 도서 총 개수 조회 (페이지네이션을 위한 총 개수 반환)
router.get("/count", bookController.getBooksCount);

// 도서 목록 조회 (전체 도서 목록)
router.get("/", bookController.searchBooks); // 기존 getBooks를 searchBooks로 대체

// 도서 상세 조회
router.get("/:bookId", bookController.getBookById);

// 도서 좋아요 추가/취소
router.post("/:bookId/like", authenticateJWT, bookController.toggleBookLike);

module.exports = router;
