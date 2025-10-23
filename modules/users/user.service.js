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

  const hashedPassword = await bcrypt.hash(password, 10);

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

// 특정 사용자의 역할을 변경하는 서비스
exports.updateUserRole = async (userId, role) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "해당 사용자를 찾을 수 없습니다."
    );
  }

  const affectedRows = await userRepository.updateUserRole(userId, role);
  if (affectedRows === 0) {
    throw new Error("역할 업데이트에 실패했습니다.");
  }
};

// 액세스 토큰 재발급
exports.refreshAccessToken = async (refreshToken) => {
  const tokenRecord = await userRepository.findAndDeleteRefreshToken(
    refreshToken
  );

  // [수정] 레파지토리에서 null을 반환하면, 여기서 404 에러를 생성합니다.
  if (!tokenRecord) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "유효하지 않거나 이미 사용된 리프레시 토큰입니다."
    );
  }

  if (new Date(tokenRecord.expires_at) <= new Date()) {
    throw new CustomError(
      INVALID_OR_EXPIRED_REFRESH_TOKEN.statusCode,
      "만료된 리프레시 토큰입니다. 다시 로그인해주세요."
    );
  }

  const user = await userRepository.findUserById(tokenRecord.user_id);
  if (!user) {
    throw new CustomError(NOT_FOUND.statusCode, "사용자를 찾을 수 없습니다.");
  }

  return generateAccessToken(user);
};

// [신규] 로그아웃 시 리프레시 토큰을 삭제하는 서비스 함수
exports.deleteRefreshToken = async (token) => {
  // 토큰이 존재할 경우에만 삭제를 시도합니다.
  // findAndDeleteRefreshToken은 토큰이 없으면 에러를 던지므로,
  // 로그아웃 시에는 에러를 무시하고 싶을 수 있습니다.
  try {
    await userRepository.findAndDeleteRefreshToken(token);
  } catch (error) {
    // 토큰이 이미 없거나 유효하지 않은 경우, 에러를 무시하고 정상 처리합니다.
    // 로그아웃은 사용자가 이미 유효하지 않은 토큰을 가지고 있더라도 성공해야 합니다.
    console.log(
      "Token for logout not found or already deleted, which is acceptable."
    );
  }
};

// 단순 조회/삭제는 Repository를 그대로 호출
exports.findUserById = (id) => userRepository.findUserById(id);
exports.getAllUsers = () => userRepository.getAllUsers();
exports.deleteUser = (id) => userRepository.deleteUser(id);
exports.saveRefreshToken = (userId, token) =>
  userRepository.saveRefreshToken(userId, token);
