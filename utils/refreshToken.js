// utils/refreshToken.js

const jwt = require("jsonwebtoken");
const userService = require("../modules/services/users.service");

const generateAndSaveRefreshToken = async (userId, payload) => {
  // Refresh Token 생성
  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET_KEY, {
    expiresIn: "7d", // 리프레시 토큰: 7일 유효
  });

  // Refresh Token 저장
  await userService.saveRefreshToken(userId, refreshToken);

  return refreshToken;
};

module.exports = { generateAndSaveRefreshToken };
