// book_market/middleware/authorize.middleware.js

const jwt = require("jsonwebtoken");
const { CustomError } = require("../utils/errorHandler.util"); // CustomError는 utils에서 가져옴
const { UNAUTHORIZED, FORBIDDEN } = require("../constants/errors");

/**
 * JWT를 검증하여 사용자를 인증하는 미들웨어
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new CustomError(UNAUTHORIZED.statusCode, "Access token is required.")
    );
  }

  // Bearer 키워드 제거 후 토큰 추출
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
    req.user = decoded; // 요청 객체에 인증된 사용자 정보 저장
    next(); // 다음 미들웨어로 제어 전달
  } catch (error) {
    // 토큰 만료 또는 형식 오류
    return next(
      new CustomError(FORBIDDEN.statusCode, "Invalid or expired token.")
    );
  }
}

module.exports = {
  authenticateJWT,
};
