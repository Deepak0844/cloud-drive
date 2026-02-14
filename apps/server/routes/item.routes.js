import express from "express";
import { handleBulkOperation } from "../controllers/item.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/bulk-operation", handleBulkOperation);

export default router;
