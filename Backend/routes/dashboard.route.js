import express from "express";
import checkRole  from "../middlewares/checkRole.js";
import { isloggedIn }  from "../middlewares/checkLogin.js";

import {
  getSummaryController,
  getSummaryByCategoryController,
  getTrendsController,
  getAdminController,
  getAdminByCategoryController,
  getAdminTrendsController,
  getUserSummaryController,
} from "../controllers/dashboard.controller.js";
var router = express.Router();

router.get("/api/dashboard/summary", isloggedIn, getSummaryController);

router.get(
  "/api/dashboard/categories",
  isloggedIn,
  getSummaryByCategoryController,
);

router.get("/api/dashboard/trends", isloggedIn, getTrendsController);

/* Admin Rouites */
router.get(
  "/api/admin/summary",
  isloggedIn,
  checkRole(["admin"]),
  getAdminController,
);

router.get(
  "/api/admin/categories",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getAdminByCategoryController,
);

router.get(
  "/api/admin/trends",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getAdminTrendsController,
);

router.get(
  "/api/admin/user-summary",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getUserSummaryController,
);


export default router;