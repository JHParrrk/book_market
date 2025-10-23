const jwt = require("jsonwebtoken");

/**
 * Access Token을 생성하는 유틸리티 함수
 * @param {object} user - 사용자 정보 객체 (e.g., { id: 1, email: 'test@test.com', name: 'John', address: '123 Main St', phone_number: '123-456-7890' })
 * @returns {string} 생성된 Access Token
 */
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name, // 사용자 이름 추가
    address: user.address, // 사용자 주소 추가
    phone_number: user.phone_number, // 사용자 전화번호 추가
    role: user.role, // 사용자 역할 추가
  };

  return jwt.sign(payload, process.env.ACCESS_SECRET_KEY, { expiresIn: "1h" });
}

/**
 * Refresh Token을 생성하는 유틸리티 함수
 * @param {object} user - 사용자 정보 객체
 * @returns {string} 생성된 Refresh Token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, process.env.REFRESH_SECRET_KEY, { expiresIn: "7d" });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
