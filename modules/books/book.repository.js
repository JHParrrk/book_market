const dbPool = require("../../database/connection/mariaDB");

// [수정] 도서 검색 쿼리
// [수정] 도서 검색 쿼리
exports.searchBooks = async ({
  category_id,
  keyword,
  page = 1,
  limit = 10,
}) => {
  let sql = `
    SELECT b.id, b.title, b.author, b.image_url, b.price, b.summary, 
           (SELECT COUNT(*) FROM book_likes bl WHERE bl.book_id = b.id) AS likes
    FROM books b
    WHERE b.deleted_at IS NULL
  `;
  const params = [];

  if (category_id) {
    // category_id가 상위 카테고리일 경우, 모든 하위 카테고리를 포함하여 검색
    // category_id가 하위 카테고리일 경우, 해당 카테고리만 검색
    sql += ` AND b.category_id IN (
              SELECT id FROM categories WHERE id = ? OR parent_id = ?
            )`;
    params.push(category_id, category_id);
  }

  if (keyword) {
    sql += ` AND (b.title LIKE ? OR b.summary LIKE ? OR b.author LIKE ?)`;
    const searchTerm = `%${keyword}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const offset = (page - 1) * limit;
  sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [books] = await dbPool.query(sql, params);
  return { books };
};

// [신규] 신간 도서 조회 쿼리
exports.findNewBooks = async ({ category_id }) => {
  let sql = `
    SELECT id, title, author, image_url, price, summary 
    FROM books 
    WHERE deleted_at IS NULL
  `;
  const params = [];

  if (category_id) {
    sql += ` AND category_id = ?`;
    params.push(category_id);
  }

  sql += ` ORDER BY created_at DESC LIMIT 4`;
  const [books] = await dbPool.query(sql, params);
  return books;
};

// [신규] 도서 총 개수 조회 쿼리 (페이지네이션용)
exports.countBooks = async ({ category_id, keyword }) => {
  let sql = `SELECT COUNT(*) as totalCount FROM books WHERE deleted_at IS NULL`;
  const params = [];

  if (category_id) {
    sql += ` AND category_id IN (
              SELECT id FROM categories WHERE id = ? OR parent_id = ?
            )`;
    params.push(category_id, category_id);
  }

  if (keyword) {
    sql += ` AND (title LIKE ? OR summary LIKE ? OR author LIKE ?)`;
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
        b.id, b.category_id, b.title, b.author, b.price, b.image_url, b.summary,
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
