import express from "express";

// Controllers
import {
  copyFolder,
  createFolder,
  deleteFolder,
  getFolderContents,
  getFolderDetails,
  getFolders,
  moveFolder,
  renameFolder,
  updateFolderTags,
} from "../controllers/folder.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";

// Schemas
import {
  createFolderSchema,
  moveFolderSchema,
  renameFolderSchema,
  copyFolderSchema,
  getFoldersSchema,
  folderIdParamSchema,
} from "../schemas/folder.schema.js";
import { updateTagsSchema } from "../schemas/file.schema.js"; // Reuse file tagging schema

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", validate(getFoldersSchema), getFolders);
router.post("/", validate(createFolderSchema), createFolder);
router.get("/:id/contents", validate(folderIdParamSchema), getFolderContents);
router.get("/:id", validate(folderIdParamSchema), getFolderDetails);
router.patch("/:id", validate(renameFolderSchema), renameFolder);
router.patch("/:id/tags", validate(updateTagsSchema), updateFolderTags);
router.post("/:id/move", validate(moveFolderSchema), moveFolder);
router.post("/:id/copy", validate(copyFolderSchema), copyFolder);
router.delete("/:id", validate(folderIdParamSchema), deleteFolder);

export default router;
