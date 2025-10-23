// 테스트 시작 전에 .env 파일을 읽어 환경 변수를 로드합니다.
require("dotenv").config();

const request = require("supertest");
const app = require("../app"); // Express 앱의 실제 경로로 수정하십시오.
const dbPool = require("../database/connection/mariaDB"); // DB 풀의 실제 경로로 수정하십시오.

describe("Cart API", () => {
  let user1Token, user2Token;
  let user1Id, user2Id;
  let book1Id, book2Id;
  let user1CartItemId;

  // 모든 테스트가 시작되기 전에 딱 한 번, 테스트 환경을 설정합니다.
  beforeAll(async () => {
    // 1. 테스트 데이터베이스를 깨끗하게 비웁니다. (외래 키 제약 조건 때문에 순서가 중요)
    await dbPool.query("SET FOREIGN_KEY_CHECKS = 0");
    await dbPool.query("TRUNCATE TABLE carts");
    await dbPool.query("TRUNCATE TABLE books");
    await dbPool.query("TRUNCATE TABLE users");
    await dbPool.query("SET FOREIGN_KEY_CHECKS = 1");

    // 2. 테스트용 사용자 2명을 생성합니다.
    let [result] = await dbPool.query(
      `INSERT INTO users (email, password, name, role) VALUES 
        ('user1@test.com', ?, 'UserOne', 'member'), 
        ('user2@test.com', ?, 'UserTwo', 'member')`,
      ["hashed_password", "hashed_password"] // 실제 해싱은 로그인 테스트에서 검증되므로 여기서는 더미 값 사용
    );
    user1Id = result.insertId;
    user2Id = user1Id + 1;

    // 3. 테스트용 도서 2권을 생성합니다.
    [result] = await dbPool.query(
      `INSERT INTO books (title, author, published_date, price, category_id) VALUES 
        ('Test Book 1', 'Author 1', '2025-01-01', 20000, 1), 
        ('Test Book 2', 'Author 2', '2025-01-02', 25000, 2)`
    );
    book1Id = result.insertId;
    book2Id = book1Id + 1;

    // 4. 각 사용자로 로그인하여 토큰을 발급받습니다. (실제 로그인 API를 모방)
    // 이 부분은 실제 user.service.login을 호출하거나, 테스트용 토큰을 직접 생성해야 합니다.
    // 여기서는 간단하게 테스트용 토큰을 직접 생성합니다.
    const jwt = require("jsonwebtoken");
    user1Token = jwt.sign(
      { id: user1Id, role: "member" },
      process.env.ACCESS_SECRET_KEY,
      { expiresIn: "1h" }
    );
    user2Token = jwt.sign(
      { id: user2Id, role: "member" },
      process.env.ACCESS_SECRET_KEY,
      { expiresIn: "1h" }
    );
  });

  // 각 테스트가 실행되기 전에, user1의 장바구니에 상품을 하나 담아둡니다.
  beforeEach(async () => {
    // carts 테이블만 초기화하여 테스트 간 독립성 보장
    await dbPool.query("TRUNCATE TABLE carts");
    const [result] = await dbPool.query(
      "INSERT INTO carts (user_id, book_id, quantity) VALUES (?, ?, ?)",
      [user1Id, book1Id, 1]
    );
    user1CartItemId = result.insertId;
  });

  // 모든 테스트가 끝난 후, DB 연결을 안전하게 종료합니다.
  afterAll(async () => {
    await dbPool.end();
  });

  // --- 1. 장바구니 상품 추가 (POST /carts) ---
  describe("POST /carts", () => {
    it("should add a new book to the cart", async () => {
      const res = await request(app)
        .post("/carts") // [수정] /cart -> /carts
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ book_id: book2Id, quantity: 2 });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("장바구니에 상품을 담았습니다.");
    });

    it("should update quantity if the book is already in the cart (upsert)", async () => {
      const res = await request(app)
        .post("/carts")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ book_id: book1Id, quantity: 5 });

      expect(res.statusCode).toBe(201);

      const [items] = await dbPool.query(
        "SELECT quantity FROM carts WHERE user_id = ? AND book_id = ?",
        [user1Id, book1Id]
      );
      // beforeEach에서 1, 여기서 5를 더하므로 6이 되어야 합니다.
      expect(items[0].quantity).toBe(6);
    });

    it("should fail with 400 if book_id is missing", async () => {
      const res = await request(app)
        .post("/carts")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ quantity: 1 });
      expect(res.statusCode).toBe(400);
    });

    it("should fail with 401 if not authenticated", async () => {
      const res = await request(app)
        .post("/carts")
        .send({ book_id: book1Id, quantity: 1 });
      expect(res.statusCode).toBe(401);
    });
  });

  // --- 2. 장바구니 조회 (GET /carts) ---
  describe("GET /carts", () => {
    // ... (이 부분은 이미 올바르게 되어 있어 수정할 필요 없음)
    it("should retrieve all items in the user's cart", async () => {
      const res = await request(app)
        .get("/carts")
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].book_id).toBe(book1Id);
    });

    it("should return an empty array for a user with an empty cart", async () => {
      const res = await request(app)
        .get("/carts")
        .set("Authorization", `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // --- 3. 장바구니 상품 수량 변경 (PUT /carts/:cartItemId) ---
  describe("PUT /carts/:cartItemId", () => {
    it("should update the quantity of a cart item", async () => {
      const res = await request(app)
        .put(`/carts/${user1CartItemId}`) // [수정] /cart -> /carts
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ quantity: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("상품 수량이 변경되었습니다.");

      const [items] = await dbPool.query(
        "SELECT quantity FROM carts WHERE id = ?",
        [user1CartItemId]
      );
      expect(items[0].quantity).toBe(10);
    });

    it("should fail with 404 when trying to update another user's cart item", async () => {
      const res = await request(app)
        .put(`/carts/${user1CartItemId}`)
        .set("Authorization", `Bearer ${user2Token}`)
        .send({ quantity: 5 });

      expect(res.statusCode).toBe(404);
    });

    it("should fail with 400 if quantity is invalid", async () => {
      const res = await request(app)
        .put(`/carts/${user1CartItemId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ quantity: 0 });
      expect(res.statusCode).toBe(400);
    });
  });

  // --- 4. 장바구니 상품 삭제 (DELETE /carts/:cartItemId) ---
  describe("DELETE /carts/:cartItemId", () => {
    it("should remove an item from the cart", async () => {
      const res = await request(app)
        .delete(`/carts/${user1CartItemId}`) // [수정] /cart -> /carts
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(
        "장바구니 상품이 성공적으로 삭제되었습니다."
      );

      const [items] = await dbPool.query("SELECT * FROM carts WHERE id = ?", [
        user1CartItemId,
      ]);
      expect(items.length).toBe(0);
    });

    it("should fail with 404 when trying to remove another user's cart item", async () => {
      const res = await request(app)
        .delete(`/carts/${user1CartItemId}`)
        .set("Authorization", `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it("should fail with 404 for a non-existent cart item", async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .delete(`/carts/${nonExistentId}`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
