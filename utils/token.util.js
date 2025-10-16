const jwt = require("jsonwebtoken");

/**
 * Access Token을 생성하는 유틸리티 함수
 * @param {object} payload - 토큰에 담을 정보 (e.g., { id: 1, email: 'test@test.com' })
 * @returns {string} 생성된 Access Token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_SECRET_KEY, { expiresIn: "1h" });
}

/**
 * Refresh Token을 생성하는 유틸리티 함수
 * @param {object} payload - 토큰에 담을 정보
 * @returns {string} 생성된 Refresh Token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET_KEY, { expiresIn: "7d" });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
