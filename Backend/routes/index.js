import express from "express";
import passport from "passport";
import User from "../models/user.js";
const router = express.Router();
import "./auth.js";

const isloggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  else res.redirect("/login");
};

const isloggedInJson = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ success: false, error: "Unauthorized" });
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
    session: false,
  }),
  async (req, res, next) => {
    try {
      const googleUser = req.user;
      if (!googleUser) {
        return res.redirect("http://localhost:3000/login");
      }
      await checkUser(googleUser);
      const freshUser = await User.findById(googleUser._id);
      if (!freshUser) {
        return res.redirect("http://localhost:3000/login");
      }
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.login(freshUser, (loginErr) => {
          if (loginErr) return next(loginErr);
          req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            res.redirect("http://localhost:3000/dashboard");
          });
        });
      });
    } catch (e) {
      next(e);
    }
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

router.get("/auth/me", isloggedInJson, (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      name: u.name,
      email: u.email,
      role: u.role,
      username: u.username,
    },
  });
});

export default router;
