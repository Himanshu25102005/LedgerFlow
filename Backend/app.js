import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import 'dotenv/config'; 
import connectDB from "./config/db.js";
import cors from "cors";
import createError from "http-errors";
import express from "express";
import session from "express-session";
import passport from "passport";
import path from "path";
import user from "./models/user.js";
import cookieParser from "cookie-parser";
import logger from "morgan";

// Routes
import recordRouter from "./routes/record.routes.js";
import dashboardRouter, { adminRouter } from "./routes/dashboard.route.js";
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";

const app = express();

// Call DB once
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
app.use("/api/admin", adminRouter);
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

export default app;