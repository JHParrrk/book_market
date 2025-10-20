/**
 * 안전하게 문자열을 정수로 변환하는 유틸리티 함수
 * @param {string} value - 변환할 값 (예: req.query.page)
 * @param {number} defaultValue - 변환 실패 시 반환할 기본 값
 * @returns {number} 변환된 정수 값
 */
// 주문페이지, 사용자 입력 값 처리 등에서 사용

const safeParseInt = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
};

module.exports = safeParseInt;
