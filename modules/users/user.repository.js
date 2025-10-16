const dbPool = require("../../database/connection/mariaDB");

// DB 쿼리 결과 파싱 유틸리티 (배열의 첫 번째 요소를 반환)
const parseResult = (result) => result[0];

// 사용자 생성 (해시된 비밀번호를 받음)
exports.createUser = async ({
  email,
  hashedPassword,
  name,
  address,
  phone_number,
}) => {
  const result = await dbPool.query(
    "INSERT INTO users (email, password, name, address, phone_number) VALUES (?, ?, ?, ?, ?)",
    [email, hashedPassword, name, address, phone_number]
  );
  return parseResult(result).insertId;
};

// 이메일로 사용자 조회 (비밀번호 포함, 로그인 검증용)
exports.findUserByEmail = async (email) => {
  const result = await dbPool.query(
    "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
    [email]
  );
  return parseResult(result)[0];
};

// ID로 사용자 조회 (비밀번호 제외)
exports.findUserById = async (id) => {
  const result = await dbPool.query(
    "SELECT id, email, name, address, phone_number FROM users WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  return parseResult(result)[0];
};

// 모든 사용자 조회
exports.getAllUsers = async () => {
  const result = await dbPool.query(
    "SELECT id, email, name, address, phone_number FROM users WHERE deleted_at IS NULL"
  );
  return parseResult(result);
};

// 사용자 정보 업데이트
exports.updateUser = async (id, updateData) => {
  // 업데이트할 필드와 값을 동적으로 생성
  const fields = Object.keys(updateData).map((key) => `${key} = ?`);
  const params = [...Object.values(updateData), id];

  const sql = `UPDATE users SET ${fields.join(
    ", "
  )} WHERE id = ? AND deleted_at IS NULL`;
  await dbPool.query(sql, params);
};

// 사용자 소프트 삭제
exports.deleteUser = async (id) => {
  const sql =
    "UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL";
  const result = await dbPool.query(sql, [id]);
  return parseResult(result).affectedRows;
};

// --- Refresh Token 관련 ---

exports.saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const sql = `
    INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`;
  await dbPool.query(sql, [userId, token, expiresAt]);
};

exports.findRefreshToken = async (token) => {
  const sql = "SELECT * FROM refresh_tokens WHERE token = ?";
  const result = await dbPool.query(sql, [token]);
  return parseResult(result)[0];
};

exports.deleteRefreshToken = async (token) => {
  const sql = "DELETE FROM refresh_tokens WHERE token = ?";
  await dbPool.query(sql, [token]);
};
