// utils/errorHandler.js

class CustomError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // 에러 로깅 (예: 콘솔, 파일, 외부 로깅 서비스)
  console.error(`[${new Date().toISOString()}] ${statusCode} - ${message}`);

  res.status(statusCode).json({ error: message });
};

module.exports = { CustomError, errorHandler };
