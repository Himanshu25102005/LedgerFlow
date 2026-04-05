import express from "express";
import checkRole from "../middlewares/checkRole.js";
import { isloggedIn } from "../middlewares/checkLogin.js";
import User from "../models/user.js";

const router = express.Router();

router.get("/", isloggedIn, checkRole(["admin"]), async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role status username")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch("/:id/status", isloggedIn, checkRole(["admin"]), async (req, res) => {
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
    ).select("name email role status username");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch("/:id/role", isloggedIn, checkRole(["admin"]), async (req, res) => {
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
    ).select("name email role status username");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
