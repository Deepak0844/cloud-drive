import express from "express";

// Controllers
import { deletePermanently, emptyTrash, getTrashedItems, restoreItem } from "../controllers/trash.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", getTrashedItems);
router.delete("/empty", emptyTrash);
router.post("/:id/restore", restoreItem);
router.delete("/:id", deletePermanently);

export default router;
