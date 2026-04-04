require("dotenv").config();
const connectDB = require("./config/db");
const cors = require("cors");
var createError = require("http-errors");
var express = require("express");
const session = require("express-session");
const passport = require("passport");
var path = require("path");
const user = require("./models/user");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var recordRouter = require("./routes/record.route");
var dashboardRouter = require("./routes/dashboard.route");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
connectDB();
connectDB();

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
passport.use(user.createStrategy());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "Himanshu_the_best",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

app.use(passport.initialize());

app.use(passport.session());

app.use("/api/records", recordRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/", indexRouter);
app.use("/users", usersRouter);

passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
