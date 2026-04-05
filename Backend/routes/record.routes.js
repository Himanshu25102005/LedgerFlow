import express from "express";
import checkRole  from "../middlewares/checkRole.js";
import { isloggedIn }  from "../middlewares/checkLogin.js";

import {
  createRecordController,
  getRecordController,
  updateRecordController,
  softDeleteRecordController,
  getRecordByIdController,
} from "../controllers/record.controller.js";
var router = express.Router();

router.post("/", isloggedIn, checkRole(["admin", "viewer"]), createRecordController);

router.get("/", isloggedIn, getRecordController);

/* Update record */
router.patch(
  "/:recordId",
  isloggedIn,
  checkRole(["admin"]),
  updateRecordController,
);

/* Sooft Delete */
router.delete(
  "/:id/delete",
  isloggedIn,
  checkRole(["admin"]),
  softDeleteRecordController,
);

/* get single record */
router.get(
  "/:id",
  isloggedIn,
  checkRole(["admin", "analyst"]),
  getRecordByIdController,
);


export default router;
