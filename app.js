var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// 라우터 모듈 불러오기
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
const { errorHandler } = require("./utils/errorHandler");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// 미들웨어 설정
app.use(logger("dev"));
// → 요청이 들어올 때마다 로그를 출력
app.use(express.json());
// → 요청의 body가 JSON이면, req.body에 파싱된 객체로 넣어줌
app.use(express.urlencoded({ extended: false }));
// → 폼 데이터(body에 key=value&...)를 req.body에 객체로 넣어줌
app.use(cookieParser());
// → 요청의 쿠키를 쉽게 쓸 수 있도록 req.cookies에 객체로 넣어줌
app.use(express.static(path.join(__dirname, "public")));
// → public 폴더 안의 파일을 정적 파일(이미지, CSS 등)로 제공
app.use(errorHandler);
// 에러 핸들러 등록

// 라우터 설정
app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
