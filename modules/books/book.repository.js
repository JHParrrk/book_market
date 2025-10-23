// book.repository.js

const dbPool = require("../../database/connection/mariaDB");
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  DEFAULT_NEW_BOOKS_LIMIT,
} = require("../../config.js");

/**
 * 카테고리 필터링 SQL 구문을 생성하고 파라미터를 추가하는 공통 함수
 * @param {number} category_id - 카테고리 ID
 * @param {Array} params - SQL 파라미터 배열
 * @returns {string} - 생성된 SQL 필터링 구문
 */
const applyCategoryFilter = (category_id, params) => {
  if (!category_id) return "";

  params.push(category_id);
  // 재귀 CTE를 사용하여 특정 카테고리 및 모든 하위 카테고리를 조회하도록 수정
  return ` AND b.category_id IN (
              WITH RECURSIVE CategoryTree AS (
                  -- 1. 시작점: 사용자가 선택한 카테고리
                  SELECT id FROM categories WHERE id = ?
                  UNION ALL
                  -- 2. 재귀 부분: 직전 단계에서 찾은 카테고리를 부모로 하는 자식 카테고리를 계속해서 찾음
                  SELECT c.id FROM categories c
                  JOIN CategoryTree ct ON c.parent_id = ct.id
              )
              SELECT id FROM CategoryTree
          )`;
};
// [수정] 도서 검색 쿼리
exports.searchBooks = async ({
  category_id,
  keyword,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}) => {
  let sql = `
    SELECT b.id, b.title, b.author, b.image_url, b.price, b.summary, b.published_date,
           (SELECT COUNT(*) FROM book_likes bl WHERE bl.book_id = b.id) AS likes
    FROM books b
    WHERE b.deleted_at IS NULL
  `;
  const params = [];

  sql += applyCategoryFilter(category_id, params);

  if (keyword) {
    sql += ` AND (b.title LIKE ? OR b.summary LIKE ? OR b.author LIKE ?)`;
    const searchTerm = `%${keyword}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const offset = (page - 1) * limit;
  sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [books] = await dbPool.query(sql, params);
  return { books };
};

// [수정] 신간 도서 조회 쿼리
exports.findNewBooks = async ({
  category_id,
  page = DEFAULT_PAGE,
  limit = DEFAULT_NEW_BOOKS_LIMIT,
}) => {
  let sql = `
    SELECT id, title, author, image_url, price, summary, published_date
    FROM books b
    WHERE b.deleted_at IS NULL
      AND b.published_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()
  `;
  const params = [];

  sql += applyCategoryFilter(category_id, params);

  const offset = (page - 1) * limit;
  sql += ` ORDER BY published_date DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [books] = await dbPool.query(sql, params);
  return books;
};

// [수정] 도서 총 개수 조회 쿼리
exports.countBooks = async ({ category_id, keyword }) => {
  let sql = `SELECT COUNT(*) as totalCount FROM books b WHERE b.deleted_at IS NULL`;
  const params = [];

  sql += applyCategoryFilter(category_id, params);

  if (keyword) {
    sql += ` AND (b.title LIKE ? OR b.summary LIKE ? OR b.author LIKE ?)`;
    const searchTerm = `%${keyword}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const [result] = await dbPool.query(sql, params);
  return result[0].totalCount;
};

// [수정] 도서 상세 정보 조회 (JOIN 사용)
exports.findBookWithDetailById = async (bookId, userId) => {
  const sql = `
    SELECT 
        b.id, b.category_id, b.title, b.author, b.price, b.image_url, b.summary, b.published_date,
        bd.isbn, bd.description, bd.table_of_contents, bd.form,
        c.name AS category_name, 
        EXISTS(SELECT 1 FROM book_likes bl WHERE bl.book_id = b.id AND bl.user_id = ?) AS isLiked
    FROM books b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN book_details bd ON b.id = bd.book_id
    WHERE b.id = ? AND b.deleted_at IS NULL`;
  const [result] = await dbPool.query(sql, [userId, bookId]);
  return result[0];
};

// 도서 '좋아요' 추가/취소
exports.toggleLike = async (bookId, userId) => {
  const checkSql = "SELECT * FROM book_likes WHERE user_id = ? AND book_id = ?";
  const [existing] = await dbPool.query(checkSql, [userId, bookId]);

  if (existing.length > 0) {
    const deleteSql =
      "DELETE FROM book_likes WHERE user_id = ? AND book_id = ?";
    await dbPool.query(deleteSql, [userId, bookId]);
    return { isLiked: false };
  } else {
    const insertSql = "INSERT INTO book_likes (user_id, book_id) VALUES (?, ?)";
    await dbPool.query(insertSql, [userId, bookId]);
    return { isLiked: true };
  }
};
