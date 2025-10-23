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

/**
 * [신규] 토큰이 있는 경우에만 사용자를 인증하는 미들웨어 (선택적)
 */
function authenticateIfPresent(req, res, next) {
  const authHeader = req.headers.authorization;

  // 토큰이 없거나 Bearer 타입이 아니면, req.user를 설정하지 않고 그냥 다음으로 넘어갑니다.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    // 토큰이 유효하면 req.user에 사용자 정보를 저장합니다.
    req.user = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
  } catch (error) {
    // 토큰이 유효하지 않더라도(만료 등) 에러를 발생시키지 않고,
    // 로그인하지 않은 사용자와 동일하게 취급하기 위해 req.user를 설정하지 않습니다.
  }

  next();
}

module.exports = {
  authenticateJWT,
  authenticateIfPresent,
};
