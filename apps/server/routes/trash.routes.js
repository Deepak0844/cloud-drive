import express from "express";

// Controllers
import { getTrashedItems, restoreItem, deletePermanently, emptyTrash } from "../controllers/trash.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.get("/", getTrashedItems);
router.post("/:id/restore", restoreItem);
router.delete("/empty", emptyTrash);
router.delete("/:id", deletePermanently);

export default router;
