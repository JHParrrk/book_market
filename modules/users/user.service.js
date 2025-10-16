const userRepository = require("./user.repository");
const { CustomError } = require("../../utils/errorHandler.util.js");
const {
  USER_ALREADY_EXISTS,
  INVALID_CREDENTIALS,
  NOT_FOUND,
  INVALID_OR_EXPIRED_REFRESH_TOKEN,
} = require("../../constants/errors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateAccessToken } = require("../../utils/token.util");

// 회원가입
exports.register = async ({ email, password, name, address, phone_number }) => {
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new CustomError(
      USER_ALREADY_EXISTS.statusCode,
      USER_ALREADY_EXISTS.message
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호 해싱

  const userId = await userRepository.createUser({
    email,
    hashedPassword,
    name,
    address,
    phone_number,
  });
  return { id: userId };
};

// 로그인
exports.login = async (email, password) => {
  if (!password) {
    throw new CustomError(
      INVALID_CREDENTIALS.statusCode,
      INVALID_CREDENTIALS.message
    );
  }

  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new CustomError(
      INVALID_CREDENTIALS.statusCode,
      INVALID_CREDENTIALS.message
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new CustomError(
      INVALID_CREDENTIALS.statusCode,
      INVALID_CREDENTIALS.message
    );
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// 사용자 정보 업데이트
exports.updateUser = async (id, updateData) => {
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }
  await userRepository.updateUser(id, updateData);
  return userRepository.findUserById(id);
};

// 액세스 토큰 재발급
exports.refreshAccessToken = async (refreshToken) => {
  const tokenRecord = await userRepository.findRefreshToken(refreshToken);
  if (!tokenRecord || new Date(tokenRecord.expires_at) <= new Date()) {
    await userRepository.deleteRefreshToken(refreshToken); // 만료된 토큰은 DB에서 삭제
    throw new CustomError(
      INVALID_OR_EXPIRED_REFRESH_TOKEN.statusCode,
      INVALID_OR_EXPIRED_REFRESH_TOKEN.message
    );
  }

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
  const user = await userRepository.findUserById(decoded.id);
  if (!user) {
    throw new CustomError(NOT_FOUND.statusCode, "User not found.");
  }

  const payload = { id: user.id, email: user.email };
  return generateAccessToken(payload);
};

// 단순 조회/삭제는 Repository를 그대로 호출
exports.findUserById = (id) => userRepository.findUserById(id);
exports.getAllUsers = () => userRepository.getAllUsers();
exports.deleteUser = (id) => userRepository.deleteUser(id);
exports.saveRefreshToken = (userId, token) =>
  userRepository.saveRefreshToken(userId, token);
exports.deleteRefreshToken = (token) =>
  userRepository.deleteRefreshToken(token);
