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
    "SELECT id, email, name, address, phone_number, role FROM users WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  return parseResult(result)[0];
};

// 모든 사용자 조회
exports.getAllUsers = async () => {
  const result = await dbPool.query(
    "SELECT id, email, name, address, phone_number, role FROM users WHERE deleted_at IS NULL"
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

/**
 * [신규] 특정 사용자의 역할을 업데이트하는 함수
 * @returns {Promise<number>} 영향을 받은 행의 수
 */
exports.updateUserRole = async (userId, role) => {
  const sql = "UPDATE users SET role = ? WHERE id = ? AND deleted_at IS NULL";
  const [result] = await dbPool.query(sql, [role, userId]);
  return result.affectedRows;
};

// --- Refresh Token 관련 ---

/**
 * [수정] 리프레시 토큰 저장 (기존 토큰 삭제 후 새 토큰 저장)
 */
exports.saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 기존 리프레시 토큰 삭제
    const deleteOldTokensSql = "DELETE FROM refresh_tokens WHERE user_id = ?";
    await conn.query(deleteOldTokensSql, [userId]);

    // 2. 새 리프레시 토큰 저장
    const insertNewTokenSql = `
      INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`;
    await conn.query(insertNewTokenSql, [userId, token, expiresAt]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * [최종 수정] 리프레시 토큰을 찾아서 즉시 삭제하는 함수
 */
exports.findAndDeleteRefreshToken = async (token) => {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    const findSql = "SELECT * FROM refresh_tokens WHERE token = ? FOR UPDATE";
    const [tokens] = await conn.query(findSql, [token]);
    const tokenRecord = tokens[0];

    if (!tokenRecord) {
      // [수정] 여기서 에러를 던지면, 아래 finally가 먼저 실행될 수 있으므로
      // 롤백만 하고, 함수 밖에서 에러를 던지도록 null을 반환합니다.
      await conn.rollback();
      conn.release();
      return null; // 토큰이 없으면 null 반환
    }

    const deleteSql = "DELETE FROM refresh_tokens WHERE id = ?";
    await conn.query(deleteSql, [tokenRecord.id]);

    await conn.commit();
    return tokenRecord; // 성공 시 토큰 기록 반환
  } catch (err) {
    // DB 관련 예기치 못한 오류 발생 시 롤백
    await conn.rollback();
    throw err; // 시스템 오류이므로 그대로 전파
  } finally {
    // try 블록에서 이미 release 되었을 수 있으므로, conn이 아직 존재할 때만 release
    if (conn) conn.release();
  }
};
