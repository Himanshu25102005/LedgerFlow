const isLoggedIn = (req, res, next) => {
  const user = req.user;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.isActive !== true) {
    return res.status(403).json({ message: "Account inactive" });
  }

  next();
};