import express from "express";

// Controllers
import { handleBulkOperation } from "../controllers/item.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/bulk-operation", handleBulkOperation);

export default router;
