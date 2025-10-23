//constants/errors.js

module.exports = {
  // 사용자 관련 에러
  USER_ALREADY_EXISTS: {
    statusCode: 409,
    message: "The provided email is already in use. Please use another email.",
  },
  INVALID_CREDENTIALS: {
    statusCode: 401,
    message:
      "The email or password you entered is incorrect. Please try again.",
  },
  NOT_FOUND: {
    statusCode: 404,
    message: "The requested resource could not be found.",
  },

  // 인증 및 권한 관련 에러
  UNAUTHORIZED: {
    // [추가] 이 부분을 추가하십시오.
    statusCode: 401,
    message: "Authentication failed. Please check your credentials.",
  },
  FORBIDDEN: {
    statusCode: 403,
    message: "You do not have permission to perform this action.",
  },
  INVALID_OR_EXPIRED_REFRESH_TOKEN: {
    statusCode: 403,
    message: "The provided refresh token is invalid or has expired.",
  },
  REFRESH_TOKEN_REQUIRED: {
    statusCode: 400,
    message: "A refresh token is required to access this resource.",
  },

  // 데이터 유효성 관련 에러
  NO_INFORMATION_TO_UPDATE: {
    statusCode: 400,
    message: "No information was provided to update the resource.",
  },
  BAD_REQUEST: {
    statusCode: 400,
    message:
      "The request could not be understood or was missing required parameters.",
  },
};
