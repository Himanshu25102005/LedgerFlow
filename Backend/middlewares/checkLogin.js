const isloggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  else res.redirect("/login");
};

export default checkLogin