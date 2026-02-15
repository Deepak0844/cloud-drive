import express from "express";

// Controllers
import {
  getAllQuotaRequests,
  getSystemStats,
  getUsers,
  handleQuotaRequest,
  updateUserQuota,
  updateUserStatus,
} from "../controllers/admin.controller.js";

// Middleware
import { authorize, protect } from "../middleware/auth.js";

// Constants
import Roles from "../constants/roles.js";

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize(Roles.ADMIN));

router.get("/users", getUsers);
router.patch("/users/:id/quota", updateUserQuota);
router.patch("/users/:id/status", updateUserStatus);
router.get("/stats", getSystemStats);
router.get("/quota-requests", getAllQuotaRequests);
router.patch("/quota-requests/:id", handleQuotaRequest);

export default router;
