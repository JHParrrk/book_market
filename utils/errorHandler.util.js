//  book_market/utils/errorHandler.util.js

/**
 * 애플리케이션 전역에서 사용할 커스텀 에러 클래스
 */
class CustomError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // 에러 발생 시 스택 트레이스를 캡처 (V8 엔진 환경)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = { CustomError };
