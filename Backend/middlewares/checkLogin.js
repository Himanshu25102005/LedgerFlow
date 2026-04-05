export const isloggedIn = (req, res, next) => {
  const user = req.user;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.status != null && user.status !== "active") {
    return res.status(403).json({ message: "Account inactive" });
  }

  next();
};