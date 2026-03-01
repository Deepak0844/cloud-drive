import express from "express";

// Controllers
import {
  getAllQuotaRequests,
  getSystemStats,
  getUsers,
  handleQuotaRequest,
  runStorageReanalysis,
  updateUserQuota,
  updateUserStatus,
} from "../controllers/admin.controller.js";

// Middleware
import { admin, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";

// Schemas
import { handleQuotaRequestSchema, updateUserQuotaSchema, updateUserStatusSchema } from "../schemas/admin.schema.js";

const router = express.Router();

// Protect all routes and restrict to admin
router.use(protect);
router.use(admin);

router.get("/users", getUsers);
router.patch("/users/:id/quota", validate(updateUserQuotaSchema), updateUserQuota);
router.patch("/users/:id/status", validate(updateUserStatusSchema), updateUserStatus);
router.get("/stats", getSystemStats);
router.get("/quota-requests", getAllQuotaRequests);
router.patch("/quota-requests/:id", validate(handleQuotaRequestSchema), handleQuotaRequest);
router.post("/storage/re-analyze", runStorageReanalysis);

export default router;
