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
} from "../controllers/folder.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", getFolders);
router.post("/", createFolder);
router.get("/:id/contents", getFolderContents);
router.get("/:id", getFolderDetails);
router.patch("/:id", renameFolder);
router.post("/:id/move", moveFolder);
router.post("/:id/copy", copyFolder);
router.delete("/:id", deleteFolder);

export default router;
