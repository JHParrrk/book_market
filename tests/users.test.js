// book_market/tests/users.test.js

// 테스트 시작 전에 .env 파일을 읽어 환경 변수를 로드합니다.
require("dotenv").config();

const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app"); // Express 앱의 실제 경로로 수정하십시오.
const dbPool = require("../database/connection/mariaDB"); // DB 풀의 실제 경로로 수정하십시오.

// DB 초기화를 위한 헬퍼 함수
const cleanDatabase = async () => {
  // 외래 키 제약 조건을 잠시 비활성화하여 순서에 상관없이 테이블을 비울 수 있게 합니다.
  await dbPool.query("SET FOREIGN_KEY_CHECKS = 0");
  await dbPool.query("TRUNCATE TABLE refresh_tokens");
  await dbPool.query("TRUNCATE TABLE users");
  await dbPool.query("SET FOREIGN_KEY_CHECKS = 1");
};

describe("User Authentication and Authorization API", () => {
  // 전역적으로 사용할 변수들
  let adminToken, userToken;
  let adminId, userId;

  // 모든 테스트가 시작되기 전에 딱 한 번, 기본 환경을 설정합니다.
  beforeAll(async () => {
    await cleanDatabase(); // 테스트 시작 전 DB 완전 초기화

    // 1. 테스트에 필요한 기본 사용자들을 생성합니다.
    let [result] = await dbPool.query(
      "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
      ["admin@test.com", await bcrypt.hash("admin123", 10), "Admin", "admin"]
    );
    adminId = result.insertId;

    [result] = await dbPool.query(
      "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
      ["user@test.com", await bcrypt.hash("user123", 10), "User", "member"]
    );
    userId = result.insertId;

    // 2. 생성한 사용자로 로그인하여 토큰을 획득합니다.
    const adminLoginRes = await request(app)
      .post("/users/login")
      .send({ email: "admin@test.com", password: "admin123" });
    if (adminLoginRes.statusCode !== 200)
      throw new Error(
        `Admin login failed: ${JSON.stringify(adminLoginRes.body)}`
      );
    adminToken = adminLoginRes.body.accessToken;

    const userLoginRes = await request(app)
      .post("/users/login")
      .send({ email: "user@test.com", password: "user123" });
    if (userLoginRes.statusCode !== 200)
      throw new Error(
        `User login failed: ${JSON.stringify(userLoginRes.body)}`
      );
    userToken = userLoginRes.body.accessToken;
  });

  // 모든 테스트가 끝난 후, DB 연결을 안전하게 종료합니다.
  afterAll(async () => {
    await dbPool.end();
  });

  // --- 그룹 1: 회원가입 및 로그아웃 ---
  describe("Authentication Actions", () => {
    // 이 그룹의 테스트들은 서로 영향을 주지 않으므로, 각자 실행됩니다.
    it("POST /users/register - should register a new user successfully", async () => {
      const res = await request(app).post("/users/register").send({
        email: "new-register@test.com",
        password: "newpassword",
        name: "Newbie",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty(
        "message",
        "User registered successfully"
      );
    });

    it("POST /users/register - should fail to register with an existing email", async () => {
      const res = await request(app).post("/users/register").send({
        email: "user@test.com",
        password: "password",
        name: "Duplicate",
      });
      expect(res.statusCode).toBe(409);
    });

    it("POST /users/logout - should logout successfully", async () => {
      const loginRes = await request(app)
        .post("/users/login")
        .send({ email: "user@test.com", password: "user123" });
      const tempAccessToken = loginRes.body.accessToken;
      const cookies = loginRes.headers["set-cookie"];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith("refreshToken=")
      );
      const tempRefreshToken = refreshTokenCookie.split(";")[0].split("=")[1];

      const res = await request(app)
        .post("/users/logout")
        .set("Authorization", `Bearer ${tempAccessToken}`)
        .set("Cookie", `refreshToken=${tempRefreshToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message", "Logout successful");
    });
  });

  // --- 그룹 2: 권한 검증 ---
  describe("Privileges and Permissions", () => {
    // 이 테스트들은 전역 beforeAll에서 생성한 토큰을 사용합니다.
    it("Admin should be able to get all users", async () => {
      const res = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it("A normal user should NOT be able to get all users", async () => {
      const res = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    it("Admin should be able to change a user's role", async () => {
      const res = await request(app)
        .put(`/users/${userId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });
      expect(res.statusCode).toBe(200);
    });

    it("Admin should NOT be able to change their own role", async () => {
      const res = await request(app)
        .put(`/users/${adminId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "member" });
      expect(res.statusCode).toBe(403);
    });

    it("A user should be able to get their own profile", async () => {
      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe(userId);
    });

    it("A user should be able to update their own profile", async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Updated Name" });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe("Updated Name");
    });
  });

  // --- 그룹 3: 토큰 재발급 (완전 독립 환경) ---
  describe("Token Refresh Mechanism", () => {
    let refreshTokenForTest;
    const refreshUserEmail = "refreshtest@test.com";
    const refreshUserPassword = "refreshpassword";

    // 각 테스트('it')가 실행되기 직전에 매번 실행되어, 완벽한 독립성을 보장합니다.
    beforeEach(async () => {
      await cleanDatabase(); // 이전 테스트의 흔적을 모두 지웁니다.
      await request(app).post("/users/register").send({
        email: refreshUserEmail,
        password: refreshUserPassword,
        name: "Refresher",
      });
      const loginRes = await request(app).post("/users/login").send({
        email: refreshUserEmail,
        password: refreshUserPassword,
      });
      const cookies = loginRes.headers["set-cookie"];
      const cookie = cookies.find((c) => c.startsWith("refreshToken="));
      refreshTokenForTest = cookie.split(";")[0].split("=")[1];
    });

    it("should refresh access token with a valid refresh token", async () => {
      const res = await request(app)
        .post("/users/refresh-token")
        .set("Cookie", `refreshToken=${refreshTokenForTest}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
    });

    it("should fail to refresh token if it is reused", async () => {
      // 1. 첫 번째 요청으로 토큰을 정상적으로 사용하고 DB에서 삭제시킵니다.
      await request(app)
        .post("/users/refresh-token")
        .set("Cookie", `refreshToken=${refreshTokenForTest}`);

      // 2. 두 번째 요청 (동일한 토큰 재사용)
      const res = await request(app)
        .post("/users/refresh-token")
        .set("Cookie", `refreshToken=${refreshTokenForTest}`);

      // 재사용된 토큰은 찾을 수 없으므로 404를 반환해야 합니다.
      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe(
        "유효하지 않거나 이미 사용된 리프레시 토큰입니다."
      );
    });
  });
});
