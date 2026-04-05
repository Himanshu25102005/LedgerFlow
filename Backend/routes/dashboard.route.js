import express from "express";
import checkRole from "../middlewares/checkRole.js";
import { isloggedIn } from "../middlewares/checkLogin.js";

import {
  getSummaryController,
  getSummaryByCategoryController,
  getTrendsController,
  getAdminController,
  getAdminByCategoryController,
  getAdminTrendsController,
  getUserSummaryController,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/summary", isloggedIn, getSummaryController);

router.get("/categories", isloggedIn, getSummaryByCategoryController);

router.get("/trends", isloggedIn, getTrendsController);

const adminRouter = express.Router();

adminRouter.get(
  "/summary",
  isloggedIn,
  checkRole(["admin"]),
  getAdminController,
);

adminRouter.get(
  "/categories",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getAdminByCategoryController,
);

adminRouter.get(
  "/trends",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getAdminTrendsController,
);

adminRouter.get(
  "/user-summary",
  isloggedIn,
  checkRole(["admin"]),
  getUserSummaryController,
);

export { adminRouter };
export default router;
