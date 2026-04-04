const express = require("express");
const passport = require("passport");
import User from "../models/user";
const router = express.Router();
require("./auth");

const isloggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  else res.redirect("/login");
};

const checkUser = async (user) => {
  const baseSlug = user.username.replace(/\s+/g, "_").toLowerCase();

  let slug = baseSlug;

  const existingUser = await User.findOne({ username: slug });

  if (existingUser) {
    const randomNumber = Math.floor(100 + Math.random() * 900);
    slug = `${baseSlug}${randomNumber}`;
  }

  user.username = slug;

  await user.save();

  return slug;
};

router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.post("/signup", async (req, res) => {
  try {
    const { name, username, email, profilePicture, password } = req.body;

    const newUser = new User({ name, username, email, profilePicture });

    const registeredUser = await User.register(newUser, password);

    res.send({
      message: "User registered successfully!",
      user: registeredUser,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/",
  }),
);

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:3000/login",
  }),
  async (req, res) => {
    await checkUser(req.user);
    console.log(req.user);
    const user = req.user;
    res.redirect("http://localhost:3000/");
  },
);

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

router.get("/getInfo", isloggedIn, (req, res, next) => {
  res.json({
    user: req.user,
  });
});

module.exports = router;
