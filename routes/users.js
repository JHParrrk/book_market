const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const userController = require("../modules/users/user.controller");
const { authenticateJWT } = require("../middleware/authorize.middleware");
const { authorizeAdmin } = require("../middleware/authorizeAdmin.middleware"); // [추가]
const validate = require("../middleware/validator.middleware");

// --- 인증이 필요 없는 라우트 ---
// 회원가입
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("유효한 이메일 주소를 입력하세요."),
    body("password")
      .isLength({ min: 4 })
      .withMessage("비밀번호는 최소 4자 이상이어야 합니다."),
    body("name").notEmpty().withMessage("이름을 입력하세요."),
    validate,
  ],
  userController.register
);

// 로그인
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("유효한 이메일 주소를 입력하세요."),
    body("password").notEmpty().withMessage("비밀번호를 입력하세요."),
    validate,
  ],
  userController.login
);

// 액세스 토큰 재발급 (인증 미들웨어 불필요)
router.post("/refresh-token", userController.refreshAccessToken);

// --- 아래 모든 라우트는 인증(authenticateJWT)이 필요합니다 ---
router.use(authenticateJWT);

// 로그아웃
router.post("/logout", userController.logout);

// 모든 사용자 목록 조회 (관리자 전용)
// authenticateJWT -> authorizeAdmin 순서로 미들웨어를 실행합니다.
router.get("/", authenticateJWT, authorizeAdmin, userController.getAllUsers);

// 특정 사용자의 역할 변경 (관리자 전용)
router.put(
  "/:userId/role",
  authorizeAdmin,
  [
    param("userId").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
    body("role")
      .isIn(["member", "admin"])
      .withMessage("유효한 역할('member' 또는 'admin')을 입력하세요."),
    validate,
  ],
  userController.updateUserRole
);

// 인증된 사용자 본인 정보 조회
router.get("/me", userController.getMe);

// 개별 회원 정보 조회, 수정, 탈퇴 (본인만 가능)
router
  .route("/:id")
  .get(
    [
      param("id").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
      validate,
    ],
    userController.getUserById
  )
  .put(
    [
      param("id").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
      body("password")
        .optional()
        .isLength({ min: 4 })
        .withMessage("비밀번호는 최소 4자 이상이어야 합니다."),
      validate,
    ],
    userController.updateUser
  )
  .delete(
    [
      param("id").isInt().withMessage("유효한 사용자 ID를 입력하세요."),
      validate,
    ],
    userController.deleteUser
  );

module.exports = router;
