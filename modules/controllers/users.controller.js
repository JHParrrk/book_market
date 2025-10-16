// modules/controllers/users.controller.js

const userService = require("../services/users.service");
const { generateToken } = require("../../utils/auth");
const { CustomError } = require("../../utils/errorHandler");
const {
  USER_ALREADY_EXISTS,
  INVALID_CREDENTIALS,
  FORBIDDEN,
  NOT_FOUND,
  NO_INFORMATION_TO_UPDATE,
  REFRESH_TOKEN_REQUIRED,
  INVALID_OR_EXPIRED_REFRESH_TOKEN,
} = require("../../constants/errors");
const jwt = require("jsonwebtoken"); // jwt를 가져오는 구문 추가
const util = require("util");
const jwtVerify = util.promisify(jwt.verify);

// 회원가입 컨트롤러
exports.register = [
  async (req, res, next) => {
    try {
      const { email, name, password, contacts } = req.body;

      // 이메일 중복 확인
      const existingUser = await userService.findUserByEmail(email);
      if (existingUser) {
        throw new CustomError(
          USER_ALREADY_EXISTS.statusCode,
          USER_ALREADY_EXISTS.message
        ); // 중복된 이메일 에러
      }

      // 사용자 생성
      const newUser = await userService.createUser({
        email,
        password,
        name,
        contacts,
      });
      res.status(201).json({ message: "User registered", userId: newUser.id }); // 사용자 생성 성공 응답
    } catch (err) {
      next(err); // 에러 처리
    }
  },
];

// 로그인 컨트롤러
exports.login = [
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // 이메일과 비밀번호로 사용자 조회
      const user = await userService.findUserByEmailAndPassword(
        email,
        password
      );
      if (user) {
        const payload = { id: user.id, email: user.email };

        // 1. Access Token 생성 (유효기간 짧게)
        const accessToken = generateToken(payload);

        // 2. Refresh Token 생성 (유효기간 길게)
        const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET_KEY, {
          expiresIn: "7d",
        });

        // 3. Refresh Token DB 저장
        await userService.saveRefreshToken(user.id, refreshToken);

        // 4. Refresh Token을 HttpOnly 쿠키에 저장
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true, // JavaScript에서 접근 불가
          secure: process.env.NODE_ENV === "production", // 프로덕션 환경에서만 secure 활성화
          sameSite: "Strict", // 동일 사이트에서만 쿠키 전송
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        });

        // 5. Access Token을 클라이언트에 반환
        res.status(200).json({
          message: "Login successful",
          accessToken, // 클라이언트는 액세스 토큰만 직접 관리
        });
      } else {
        // 사용자 인증 실패 시 에러 반환
        next(
          new CustomError(
            INVALID_CREDENTIALS.statusCode,
            INVALID_CREDENTIALS.message
          )
        );
      }
    } catch (err) {
      next(err); // 에러 처리
    }
  },
];

// 본인 정보 조회 컨트롤러
exports.getMe = async (req, res, next) => {
  try {
    // JWT에서 추출한 ID로 사용자 조회
    const user = await userService.findUserById(req.user.id);
    if (user) {
      res.status(200).json({ user }); // 사용자 정보 반환
    } else {
      next(new CustomError(NOT_FOUND.statusCode, NOT_FOUND.message)); // 사용자 미발견 시 에러 반환
    }
  } catch (err) {
    next(err); // 에러 처리
  }
};

// 전체 사용자 조회 컨트롤러
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(); // 모든 사용자 조회
    res.status(200).json({ users }); // 사용자 목록 반환
  } catch (err) {
    next(err); // 에러 처리
  }
};

// 특정 사용자 조회 컨트롤러
exports.getUserById = [
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10); // 요청 URL에서 사용자 ID 추출
      if (req.user.id !== id) {
        // 본인만 조회 가능
        return next(
          new CustomError(
            FORBIDDEN.statusCode,
            "You can only view your own profile."
          )
        );
      }

      const user = await userService.findUserById(id); // 사용자 조회
      if (user) {
        res.status(200).json({ user }); // 사용자 정보 반환
      } else {
        next(new CustomError(NOT_FOUND.statusCode, NOT_FOUND.message)); // 사용자 미발견 시 에러 반환
      }
    } catch (err) {
      next(err); // 에러 처리
    }
  },
];

// 사용자 업데이트 컨트롤러
exports.updateUser = [
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10); // 요청 URL에서 사용자 ID 추출
      if (req.user.id !== id) {
        // 본인만 수정 가능
        return next(
          new CustomError(
            FORBIDDEN.statusCode,
            "You can only update your own profile."
          )
        );
      }

      const { password, name, contacts } = req.body;
      if (!password && !name && !contacts) {
        // 수정할 데이터 없음
        return next(
          new CustomError(
            NO_INFORMATION_TO_UPDATE.statusCode,
            NO_INFORMATION_TO_UPDATE.message
          )
        );
      }

      const updatedUser = await userService.updateUser(id, {
        password,
        name,
        contacts,
      }); // 사용자 정보 업데이트
      if (updatedUser) {
        res.status(200).json({ message: "User updated", user: updatedUser }); // 업데이트 성공 응답
      } else {
        next(new CustomError(NOT_FOUND.statusCode, NOT_FOUND.message)); // 사용자 미발견 시 에러 반환
      }
    } catch (err) {
      next(err); // 에러 처리
    }
  },
];

// 사용자 삭제 컨트롤러
exports.deleteUser = [
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10); // 요청 URL에서 사용자 ID 추출
      if (req.user.id !== id) {
        // 본인만 삭제 가능
        return next(
          new CustomError(
            FORBIDDEN.statusCode,
            "You can only delete your own account."
          )
        );
      }

      const result = await userService.deleteUser(id); // 사용자 삭제
      if (result.affectedRows > 0) {
        res.status(200).json({ message: "User deleted" }); // 삭제 성공 응답
      } else {
        next(new CustomError(NOT_FOUND.statusCode, NOT_FOUND.message)); // 사용자 미발견 시 에러 반환
      }
    } catch (err) {
      next(err); // 에러 처리
    }
  },
];

// 로그아웃 컨트롤러
exports.logout = async (req, res, next) => {
  try {
    // HttpOnly 쿠키에서 리프레시 토큰 가져오기
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return next(
        new CustomError(
          REFRESH_TOKEN_REQUIRED.statusCode,
          REFRESH_TOKEN_REQUIRED.message
        )
      );
    }

    // DB에서 리프레시 토큰 삭제
    await userService.deleteRefreshToken(refreshToken);

    // HttpOnly 쿠키 삭제
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 프로덕션 환경에서만 secure 활성화
      sameSite: "Strict",
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    next(err); // 에러 처리
  }
};

// 액세스 토큰 재발급 컨트롤러
exports.refreshAccessToken = async (req, res, next) => {
  try {
    // HttpOnly 쿠키에서 리프레시 토큰 가져오기
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new CustomError(
        REFRESH_TOKEN_REQUIRED.statusCode,
        REFRESH_TOKEN_REQUIRED.message
      );
    }

    // DB에서 리프레시 토큰 확인
    const tokenRecord = await userService.findRefreshToken(refreshToken);

    if (!tokenRecord || new Date(tokenRecord.expires_at) <= new Date()) {
      throw new CustomError(
        INVALID_OR_EXPIRED_REFRESH_TOKEN.statusCode,
        INVALID_OR_EXPIRED_REFRESH_TOKEN.message
      );
    }

    // 리프레시 토큰 유효성 검증
    const user = await jwtVerify(refreshToken, process.env.REFRESH_SECRET_KEY);

    // 새로운 Access Token 발급
    const payload = { id: user.id, email: user.email };
    const newAccessToken = generateToken(payload);

    // 새로운 Access Token 반환
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    next(err); // 에러 처리
  }
};
