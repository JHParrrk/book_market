// modules/services/users.service.js

const dbPool = require("../../database/connection/mariaDB");

// DB 쿼리 결과를 파싱하는 헬퍼 함수
// MariaDB 드라이버는 [결과, 필드정보] 형태의 배열을 반환하므로 첫 번째 요소만 사용합니다.
const parseResult = (result) => result[0];

exports.createUser = async ({ email, name, password, contacts }) => {
  const result = await dbPool.query(
    "INSERT INTO users (email, password, name, contacts) VALUES (?, ?, ?, ?)",
    [email, password, name, contacts]
  );
  const insertId = parseResult(result).insertId;
  return { id: insertId, email, name };
};

exports.findUserByEmail = async (email) => {
  const result = await dbPool.query(
    "SELECT id, email, name, contacts FROM users WHERE email = ?",
    [email]
  );
  return parseResult(result)[0]; // 첫 번째 사용자 반환
};

exports.findUserByEmailAndPassword = async (email, password) => {
  const result = await dbPool.query(
    "SELECT id, email, name, contacts FROM users WHERE email = ? AND password = ?",
    [email, password]
  );
  return parseResult(result)[0];
};

exports.findUserById = async (id) => {
  const result = await dbPool.query(
    "SELECT id, email, name, contacts FROM users WHERE id = ?",
    [id]
  );
  return parseResult(result)[0];
};

exports.getAllUsers = async () => {
  const result = await dbPool.query(
    "SELECT id, email, name, contacts FROM users"
  );
  return parseResult(result);
};

exports.updateUser = async (id, { password, name, contacts }) => {
  // 업데이트할 필드만 동적으로 구성
  const fields = [];
  const params = [];
  if (password) {
    fields.push("password = ?");
    params.push(password);
  }
  if (name) {
    fields.push("name = ?");
    params.push(name);
  }
  if (contacts) {
    fields.push("contacts = ?");
    params.push(JSON.stringify(contacts));
  }
  params.push(id); // WHERE 절에 들어갈 id

  const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
  await dbPool.query(sql, params);

  // 업데이트된 정보를 다시 조회하여 반환
  return this.findUserById(id);
};

exports.deleteUser = async (id) => {
  const result = await dbPool.query("DELETE FROM users WHERE id = ?", [id]);
  return parseResult(result); // affectedRows 등의 정보가 담긴 객체 반환
};

// 리프레시 토큰 저장 함수
exports.saveRefreshToken = async (userId, token) => {
  // 토큰 만료 시간 설정 (7일 후)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 동일한 사용자에 대한 기존 토큰이 있다면 덮어쓰기(UPSERT)
  // expires_at 컬럼을 추가하여 만료 시간도 함께 저장합니다.
  const createdAt = new Date(); // 현재 시간 추가

  const sql = `
    INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at), created_at = VALUES(created_at)
  `;
  await dbPool.query(sql, [userId, token, expiresAt, createdAt]);
};

// 리프레시 토큰 조회 함수
exports.findRefreshToken = async (token) => {
  const sql = "SELECT * FROM refresh_tokens WHERE token = ?";
  const result = await dbPool.query(sql, [token]);
  return parseResult(result)[0];
};

// 리프레시 토큰 삭제 함수
exports.deleteRefreshToken = async (token) => {
  const sql = "DELETE FROM refresh_tokens WHERE token = ?";
  await dbPool.query(sql, [token]);
};
