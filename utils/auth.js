const jwt = require("jsonwebtoken");

// JWT 생성 함수
function generateToken(payload) {
  // - JWT 서명을 검증하기 위한 비밀 키.
  const SECRET_KEY = process.env.SECRET_KEY; // .env에 저장된 SECRET_KEY 사용
  // 설계 이유:
  // - 사용자의 인증 정보를 기반으로 JWT를 생성합니다.
  // - payload는 사용자를 식별할 수 있는 최소한의 정보를 담음 (예: id, userID 등).
  // - 토큰의 유효기간은 1시간으로 설정하여 보안성을 강화.
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" }); // 1시간 유효
}

// JWT 검증 미들웨어
function authenticateJWT(req, res, next) {
  // 설계 이유:
  // - 클라이언트가 요청 시 제공한 JWT를 검증하여 인증 상태를 확인.
  // - "Authorization" 헤더에서 Bearer 토큰을 추출하여 검증.
  const token = req.header("Authorization")?.split(" ")[1]; // Bearer 토큰에서 추출

  if (!token) {
    // 설계 이유:
    // - 토큰이 없으면 인증되지 않은 요청이므로 401 Unauthorized 상태 코드 반환.
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const SECRET_KEY = process.env.SECRET_KEY;
    // 설계 이유:
    // - 요청에서 받은 토큰을 SECRET_KEY로 검증.
    // - 검증된 토큰에서 사용자 정보를 추출하여 `req.user`에 저장.
    const decoded = jwt.verify(token, SECRET_KEY); // 토큰 검증
    req.user = decoded; // 검증된 사용자 정보 저장
    next(); // 다음 미들웨어로 진행
  } catch (error) {
    // 설계 이유:
    // - 토큰이 만료되었거나 유효하지 않은 경우 403 Forbidden 상태 코드 반환.
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// 모듈 내보내기
// 설계 이유:
// - JWT 생성 및 검증 로직을 별도의 유틸리티 파일로 분리하여 재사용성을 높임.
// - 인증 관련 코드를 한 곳에서 관리함으로써 유지보수성을 향상.
module.exports = {
  generateToken,
  authenticateJWT,
};
