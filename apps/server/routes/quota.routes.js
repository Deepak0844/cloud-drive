import express from "express";

// Controllers
import { getQuotaUsage, requestQuotaIncrease } from "../controllers/quota.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/usage", getQuotaUsage);
router.post("/request", requestQuotaIncrease);

export default router;
