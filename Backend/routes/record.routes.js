import express from "express";
import { checkRole } from "../middlewares/checkRole";
import { isloggedIn } from "../middlewares/checkLogin";
import User from "../models/users";
import {
  createRecordController,
  getRecordController,
  updateRecordController,
  softDeleteRecordController,
  getRecordByIdController
} from "../controllers/record.controller";
var router = express.Router();

/* Create transaction */
router.post("/api/records", isloggedIn, createRecordController);

/* Get records */
router.get(
  "/api/records",
  isloggedIn,
  checkRole(["admin", "analyst"], getRecordController),
);

/* Update record */
router.patch(
  "/api/records/:recordId",
  isloggedIn,
  checkRole(["admin"]),
  updateRecordController,
);

/* Soft Delete */
router.delete(
  "/api/records/:id/delete",
  isloggedIn,
  checkRole(["admin"]),
  softDeleteRecordController,
);
export default router;

/* get sungle record */
router.get(
  "/api/records/:id",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getRecordByIdController,
);
