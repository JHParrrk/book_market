// routes/users.js

const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const userController = require("../modules/controllers/users.controller");
const { authenticateJWT } = require("../utils/auth");
const validate = require("../utils/validate"); // validate 미들웨어 가져오기

// 회원가입 및 로그인 (인증 불필요)
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("유효한 이메일 주소를 입력하세요."),
    body("password")
      .isLength({ min: 4 })
      .withMessage("비밀번호는 최소 4자 이상이어야 합니다."),
    body("name").notEmpty().withMessage("이름을 입력하세요."),
    body("contacts")
      .matches(/^\d{3}-\d{3,4}-\d{4}$/)
      .withMessage("유효한 연락처를 입력하세요."),
    validate, // 검증 실행
  ],
  userController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("유효한 이메일 주소를 입력하세요."),
    body("password").notEmpty().withMessage("비밀번호를 입력하세요."),
    validate, // 검증 실행
  ],
  userController.login
);

// --- 보호된 라우트 (인증 필요) ---
// 아래의 모든 라우트는 authenticateJWT 미들웨어를 통과해야만 접근 가능합니다.

// 전체 회원 조회 (관리자용 기능으로 가정)
router.get("/", authenticateJWT, userController.getAllUsers);

// 인증된 사용자 본인의 정보 조회
router.get("/me", authenticateJWT, userController.getMe);

// 개별 회원 정보 조회, 수정, 탈퇴 (본인만 가능)
router
  .route("/:id")
  .get(
    authenticateJWT,
    [
      param("id").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
      validate,
    ],
    userController.getUserById
  )
  .put(
    authenticateJWT,
    [
      param("id").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
      body("password")
        .optional()
        .isLength({ min: 6 })
        .withMessage("비밀번호는 최소 6자 이상이어야 합니다."),
      body("name").optional().notEmpty().withMessage("이름을 입력하세요."),
      body("contacts")
        .optional()
        .matches(/^\d{3}-\d{3,4}-\d{4}$/)
        .withMessage("유효한 연락처를 입력하세요."),
      validate,
    ],
    userController.updateUser
  )
  .delete(
    authenticateJWT,
    [
      param("id").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
      validate,
    ],
    userController.deleteUser
  );

// 리프레시 토큰으로 새 액세스 토큰 발급
router.post("/refresh-token", userController.refreshAccessToken);

// 로그아웃
router.post("/logout", userController.logout);

module.exports = router;
