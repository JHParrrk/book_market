const { validationResult } = require("express-validator");

/**
 * express-validator의 유효성 검사 결과를 처리하는 미들웨어
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 유효성 검사 실패 시 400 Bad Request 응답
    return res.status(400).json({ errors: errors.array() });
  }
  next(); // 유효성 검사 통과 시 다음 미들웨어로 진행
};

module.exports = validate;
