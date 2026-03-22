import express from "express";

// Controllers
import { getQuotaUsage, getQuotaBreakdown, requestQuotaIncrease } from "#controllers/quotaController.js";

// Middleware
import { protect } from "#middlewares/auth.js";
import validate from "#middlewares/validate.js";

// Schemas
import { requestQuotaIncreaseSchema } from "#schemas/common.schema.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/usage", getQuotaUsage);
router.get("/breakdown", getQuotaBreakdown);
router.post("/request", validate(requestQuotaIncreaseSchema), requestQuotaIncrease);

export default router;
