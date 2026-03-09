import express from "express";

// Controllers
import { handleBulkOperation } from "#controllers/itemController.js";

// Middleware
import { protect } from "#middlewares/auth.js";
import validate from "#middlewares/validate.js";

// Schemas
import { bulkOperationSchema } from "#schemas/item.schema.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/bulk-operation", validate(bulkOperationSchema), handleBulkOperation);

export default router;
