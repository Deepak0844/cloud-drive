import express from "express";

// Middleware
import { protect } from "#middlewares/auth.js";
import validate from "#middlewares/validate.js";

// Controllers
import { getTrashItems, restoreItems, deleteItemsPermanently, emptyTrash } from "#controllers/trashController.js";

// Schemas
import { trashRestoreSchema, trashPermanentDeleteSchema } from "#schemas/common.schema.js";

const router = express.Router();

// All trash routes are protected
router.use(protect);

router.get("/", getTrashItems);
router.post("/restore", validate(trashRestoreSchema), restoreItems);
router.delete("/permanent", validate(trashPermanentDeleteSchema), deleteItemsPermanently);
router.delete("/empty", emptyTrash);

export default router;
