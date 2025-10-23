// 이 스크립트는 프로젝트의 최상위 경로에 scripts 폴더를 만들어 위치시킵니다.
// 데이터베이스 연결 설정을 가져옵니다. 경로를 실제 프로젝트에 맞게 수정해야 합니다.
const dbPool = require("../database/connection/mariaDB");

const cleanup = async () => {
  let conn;
  try {
    conn = await dbPool.getConnection();
    console.log(
      `[${new Date().toISOString()}] Starting cleanup of expired refresh tokens...`
    );

    const sql = "DELETE FROM refresh_tokens WHERE expires_at <= NOW()";
    const [result] = await conn.query(sql);

    console.log(
      `[${new Date().toISOString()}] Cleanup complete. Deleted ${
        result.affectedRows
      } expired tokens.`
    );
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] Error during token cleanup:`,
      err
    );
    process.exit(1); // 에러 발생 시 비정상 종료
  } finally {
    if (conn) conn.release();
    process.exit(0); // 정상 종료
  }
};

cleanup();
