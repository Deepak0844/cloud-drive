import express from "express";

// Middleware
import { protect } from "../middlewares/auth.js";

// Controllers
import { getTrashItems, restoreItems, deleteItemsPermanently, emptyTrash } from "../controllers/trashController.js";

const router = express.Router();

// All trash routes are protected
router.use(protect);

router.get("/", getTrashItems);
router.post("/restore", restoreItems);
router.delete("/permanent", deleteItemsPermanently);
router.delete("/empty", emptyTrash);

export default router;
