import express from "express";
import { checkRole } from "../middlewares/checkRole";
import { isloggedIn } from "../middlewares/checkLogin";
import User from "../models/user";
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

/* Get Single User Details */
router.get("/api/me", isloggedIn, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, username, email, role, totalIncome, totalExpense } = req.user;

    return res.status(200).json({
      success: true,
      data: { name, username, email, role, totalIncome, totalExpense },
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

/* List all users */
router.get("/api/user", isloggedIn, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find()
        .select("name username email role totalIncome totalExpense") // Keep it clean as we discussed
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      count: users.length,
      totalPages,
      currentPage: page,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* Get single user details */
router.get("/api/users/:id", isloggedIn, async (req, res) => {
  try {
    const userData = await User.findOne({
      _id: req.params.id,
    }).select("name username email role totalIncome totalExpense");

    res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

/* Change User's Role */
router.patch(
  "/api/user/:id/role",
  isloggedIn,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { role } = req.body;

      const allowedRoles = ["admin", "analyst", "viewer"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true },
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        success: true,
        user: updatedUser,
      });
    } catch (e) {
      return res.status(500).json({
        error: e.message,
      });
    }
  },
);

/* Toggle active/inActive status */
router.patch(
  "/api/users/:id/status",
  isloggedIn,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatus = ["active", "inactive"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true },
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        success: true,
        user: updatedUser,
      });
    } catch (e) {
      return res.status(500).json({
        error: e.message,
      });
    }
  },
);

/* Delete a user */
router.delete(
  "/api/users/:id",
  isloggedIn,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const userIdToDelete = req.params.id;

      const user = await User.findById(userIdToDelete);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          message: "You cannot delete yourself",
        });
      }
      await User.deleteOne({ _id: userIdToDelete });

      return res.status(200).json({
        success: true,
      });
    } catch (e) {
      return res.status(500).json({
        error: e.message,
      });
    }
  },
);

module.exports = router;
