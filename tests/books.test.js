// book_market/tests/books.test.js

// .env 파일 로드
require("dotenv").config();

const request = require("supertest");
const app = require("../app"); // Express 앱 경로
const dbPool = require("../database/connection/mariaDB"); // DB 풀 경로
const jwt = require("jsonwebtoken");

describe("Books API", () => {
  let user1Token, user2Token;
  let user1Id, user2Id;
  let category1Id, category2Id;
  let book1Id, book2Id, newBookId;

  // --- 테스트 환경 설정 ---
  beforeAll(async () => {
    // 1. 외래 키 제약 조건 비활성화 및 테이블 초기화
    await dbPool.query("SET FOREIGN_KEY_CHECKS = 0");
    await dbPool.query("TRUNCATE TABLE book_likes");
    await dbPool.query("TRUNCATE TABLE book_details");
    await dbPool.query("TRUNCATE TABLE books");
    await dbPool.query("TRUNCATE TABLE categories");
    await dbPool.query("TRUNCATE TABLE users");
    await dbPool.query("SET FOREIGN_KEY_CHECKS = 1");

    // 2. 테스트용 사용자 생성
    let [result] = await dbPool.query(
      `INSERT INTO users (email, password, name) VALUES 
        ('book_user1@test.com', 'hashed_password', 'BookUserOne'),
        ('book_user2@test.com', 'hashed_password', 'BookUserTwo')`
    );
    user1Id = result.insertId;
    user2Id = user1Id + 1;

    // 3. 테스트용 카테고리 생성 (parent-child 관계 포함)
    [result] = await dbPool.query(
      `INSERT INTO categories (name) VALUES ('소설'), ('과학')`
    );
    category1Id = result.insertId; // 소설
    category2Id = category1Id + 1; // 과학

    // 4. 테스트용 도서 생성
    const today = new Date();
    const oneWeekAgo = new Date(today.setDate(today.getDate() - 7))
      .toISOString()
      .slice(0, 10);
    [result] = await dbPool.query(
      `INSERT INTO books (title, author, published_date, price, category_id, summary) VALUES 
        ('리액트 정복하기', '김리액', '2024-01-01', 30000, ?, '리액트 기초부터 심화까지 다루는 최고의 기술 서적'),
        ('자바스크립트의 역사', '박자바', '2023-05-15', 25000, ?, '자바스크립트의 탄생과 발전 과정을 담은 역사 소설'),
        ('최신 과학 기술 동향', '이사이언', ?, 40000, ?, 'AI와 우주 기술에 대한 최신 보고서')`,
      [category2Id, category1Id, oneWeekAgo, category2Id]
    );
    book1Id = result.insertId; // 리액트 정복하기
    book2Id = book1Id + 1; // 자바스크립트의 역사
    newBookId = book2Id + 1; // 최신 과학 기술 동향 (신간)

    // 5. 테스트용 '좋아요' 데이터 생성 (user1이 book2를 좋아함)
    await dbPool.query(
      "INSERT INTO book_likes (user_id, book_id) VALUES (?, ?)",
      [user1Id, book2Id]
    );

    // 6. 테스트용 토큰 발급
    user1Token = jwt.sign({ id: user1Id }, process.env.ACCESS_SECRET_KEY);
    user2Token = jwt.sign({ id: user2Id }, process.env.ACCESS_SECRET_KEY);
  });

  // --- 테스트 종료 후 정리 ---
  afterAll(async () => {
    await dbPool.end();
  });

  // --- 1. 도서 검색 (GET /books/search 또는 GET /books) ---
  describe("GET /books/search", () => {
    it("should return books matching the keyword", async () => {
      const res = await request(app).get("/books/search?keyword=리액트");
      expect(res.statusCode).toBe(200);
      expect(res.body.books).toHaveLength(1);
      expect(res.body.books[0].title).toBe("리액트 정복하기");
    });

    it("should return books matching the category", async () => {
      const res = await request(app).get(
        `/books/search?category_id=${category1Id}`
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.books).toHaveLength(1); // '자바스크립트의 역사'
    });

    it("should return paginated results", async () => {
      const res = await request(app).get("/books/search?limit=1&page=2");
      expect(res.statusCode).toBe(200);
      expect(res.body.books).toHaveLength(1);
      expect(res.body.books[0].title).toBe("자바스크립트의 역사");
    });
  });

  // --- 2. 신간 도서 조회 (GET /books/new) ---
  describe("GET /books/new", () => {
    it("should return new books published within a month", async () => {
      const res = await request(app).get("/books/new");
      expect(res.statusCode).toBe(200);
      expect(res.body.books).toHaveLength(1);
      expect(res.body.books[0].id).toBe(newBookId);
    });

    it("should return new books filtered by category", async () => {
      const res = await request(app).get(
        `/books/new?category_id=${category1Id}`
      ); // 소설 카테고리 신간은 없음
      expect(res.statusCode).toBe(200);
      expect(res.body.books).toHaveLength(0);
    });
  });

  // --- 3. 도서 총 개수 조회 (GET /books/count) ---
  describe("GET /books/count", () => {
    it("should return the total count of books for a search", async () => {
      const res = await request(app).get("/books/count?keyword=역사");
      expect(res.statusCode).toBe(200);
      expect(res.body.totalCount).toBe(1);
    });
  });

  // --- 4. 도서 상세 조회 (GET /books/:bookId) ---
  describe("GET /books/:bookId", () => {
    it("should return book details with isLiked=true for a logged-in user who liked it", async () => {
      const res = await request(app)
        .get(`/books/${book2Id}`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("자바스크립트의 역사");
      expect(res.body.isLiked).toBe(1); // EXISTS는 1 또는 0을 반환
    });

    it("should return book details with isLiked=false for a user who did not like it", async () => {
      const res = await request(app)
        .get(`/books/${book1Id}`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("리액트 정복하기");
      expect(res.body.isLiked).toBe(0);
    });

    it("should return 404 for a non-existent book", async () => {
      const nonExistentId = 99999;
      const res = await request(app).get(`/books/${nonExistentId}`);
      expect(res.statusCode).toBe(404);
    });
  });

  // --- 5. 도서 좋아요 토글 (POST /books/:bookId/like) ---
  describe("POST /books/:bookId/like", () => {
    it("should add a like for a book (isLiked: true)", async () => {
      // user1이 아직 좋아하지 않는 book1에 '좋아요' 추가
      const res = await request(app)
        .post(`/books/${book1Id}/like`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isLiked).toBe(true);
    });

    it("should remove a like for a book (isLiked: false)", async () => {
      // 이미 '좋아요'를 누른 book2에 다시 요청하여 취소
      const res = await request(app)
        .post(`/books/${book2Id}/like`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isLiked).toBe(false);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).post(`/books/${book1Id}/like`);
      expect(res.statusCode).toBe(401);
    });
  });
});
