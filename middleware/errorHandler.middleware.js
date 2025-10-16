//  book_market/middleware/errorHandler.middleware.js

/**
 * 애플리케이션의 모든 에러를 최종적으로 처리하는 미들웨어
 */

const errorHandler = (err, req, res, next) => {
  // CustomError가 아닌 다른 에러가 발생한 경우를 대비
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // 운영 환경에서는 상세한 에러 로그를 파일이나 외부 서비스에 기록하는 것이 좋음
  console.error(`[ERROR] ${statusCode} - ${message} \n ${err.stack}`);

  res.status(statusCode).json({
    error: {
      message: message,
    },
  });
};

module.exports = errorHandler;
