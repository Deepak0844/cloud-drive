import express from "express";

// Controllers
import {
  getFolders,
  createFolder,
  getFolderContents,
  renameFolder,
  deleteFolder,
  moveFolder,
  copyFolder,
  getFolderDetails,
} from "../controllers/folder.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getFolders);
router.post("/", createFolder);
router.get("/:id/contents", getFolderContents);
router.get("/:id", getFolderDetails);
router.patch("/:id", renameFolder);
router.post("/:id/move", moveFolder);
router.post("/:id/copy", copyFolder);
router.delete("/:id", deleteFolder);

module.exports = router;
