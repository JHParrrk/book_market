const userService = require("./user.service");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/token.util");
const { CustomError } = require("../../utils/errorHandler.util");
const {
  FORBIDDEN,
  NOT_FOUND,
  NO_INFORMATION_TO_UPDATE,
  REFRESH_TOKEN_REQUIRED,
  BAD_REQUEST,
} = require("../../constants/errors");

// 회원가입
exports.register = async (req, res, next) => {
  try {
    const newUser = await userService.register(req.body);
    res
      .status(201)
      .json({ message: "User registered successfully", userId: newUser.id });
  } catch (err) {
    next(err);
  }
};

// 로그인
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await userService.login(email, password);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await userService.saveRefreshToken(user.id, refreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({ message: "Login successful", accessToken });
  } catch (err) {
    next(err);
  }
};

// 본인 정보 조회
exports.getMe = async (req, res, next) => {
  try {
    // authenticateJWT 미들웨어에서 req.user에 id를 넣어줌
    const user = await userService.findUserById(req.user.id);
    if (!user) {
      return next(new CustomError(NOT_FOUND.statusCode, NOT_FOUND.message));
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// 특정 사용자 조회
exports.getUserById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    // [개선] 관리자가 아닌 경우에만, 본인 정보인지 확인합니다.
    // 관리자(admin)는 모든 사용자의 정보를 조회할 수 있어야 합니다.
    if (req.user.role !== "admin" && req.user.id !== id) {
      return next(
        new CustomError(
          FORBIDDEN.statusCode,
          "자신의 프로필만 조회할 수 있습니다."
        )
      );
    }

    const user = await userService.findUserById(id);
    if (!user) {
      return next(
        new CustomError(NOT_FOUND.statusCode, "해당 사용자를 찾을 수 없습니다.")
      );
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// 사용자 정보 업데이트
exports.updateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    // 관리자가 아닌 경우에만, 본인 정보인지 확인합니다.
    if (req.user.role !== "admin" && req.user.id !== id) {
      return next(
        new CustomError(
          FORBIDDEN.statusCode,
          "You can only update your own profile."
        )
      );
    }

    if (Object.keys(req.body).length === 0) {
      return next(
        new CustomError(
          NO_INFORMATION_TO_UPDATE.statusCode,
          NO_INFORMATION_TO_UPDATE.message
        )
      );
    }

    const updatedUser = await userService.updateUser(id, req.body);
    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    next(err);
  }
};

// 사용자 삭제
exports.deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.id !== id) {
      return next(
        new CustomError(
          FORBIDDEN.statusCode,
          "You can only delete your own account."
        )
      );
    }
    const affectedRows = await userService.deleteUser(id);
    if (affectedRows > 0) {
      res.clearCookie("refreshToken");
      res
        .status(200)
        .json({ message: "User account deactivated successfully." });
    } else {
      next(new CustomError(NOT_FOUND.statusCode, NOT_FOUND.message));
    }
  } catch (err) {
    next(err);
  }
};

// 로그아웃
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await userService.deleteRefreshToken(refreshToken);
    }
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    next(err);
  }
};

// 액세스 토큰 재발급
exports.refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new CustomError(
        REFRESH_TOKEN_REQUIRED.statusCode,
        REFRESH_TOKEN_REQUIRED.message
      );
    }
    const newAccessToken = await userService.refreshAccessToken(refreshToken);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

// 전체 사용자 조회 (예시 - 관리자용)
exports.getAllUsers = async (req, res, next) => {
  try {
    // [정리] 미들웨어에서 권한을 검증하므로, 컨트롤러 내의 if문은 필요 없습니다.
    const users = await userService.getAllUsers();
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

/**
 * [신규] 특정 사용자의 역할을 변경하는 핸들러 (관리자용)
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // 1. 입력값 검증
    if (!role || (role !== "member" && role !== "admin")) {
      throw new CustomError(
        BAD_REQUEST.statusCode,
        "유효하지 않은 역할입니다. 'user' 또는 'admin'만 가능합니다."
      );
    }

    // 2. 자기 자신의 역할을 변경하는 것을 방지 (선택 사항이지만 권장)
    if (req.user.id === parseInt(userId, 10)) {
      throw new CustomError(
        FORBIDDEN.statusCode,
        "자기 자신의 역할은 변경할 수 없습니다."
      );
    }

    await userService.updateUserRole(userId, role);

    res
      .status(200)
      .json({ message: "사용자 역할이 성공적으로 변경되었습니다." });
  } catch (err) {
    next(err);
  }
};
