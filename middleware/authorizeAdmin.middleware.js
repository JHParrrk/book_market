// book_market/middleware/authorizeAdmin.middleware.js

const { CustomError } = require("../utils/errorHandler.util");
const { FORBIDDEN } = require("../constants/errors");

/**
 * 관리자 권한을 확인하는 미들웨어
 */
function authorizeAdmin(req, res, next) {
  // authenticateJWT 미들웨어를 통해 설정된 req.user 객체를 확인합니다.
  if (req.user && req.user.role === "admin") {
    // 사용자의 역할이 'admin'이면 다음 미들웨어로 제어를 전달합니다.
    next();
  } else {
    // 관리자가 아니면 403 Forbidden 에러를 반환합니다.
    return next(
      new CustomError(
        FORBIDDEN.statusCode,
        "접근 권한이 없습니다. 관리자만 접근할 수 있습니다."
      )
    );
  }
}

module.exports = {
  authorizeAdmin,
};
