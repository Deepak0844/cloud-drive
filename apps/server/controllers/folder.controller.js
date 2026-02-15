import fs from "fs";
import path from "path";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";
import SocketService from "../services/socket.service.js";

// Utils
import DbUtils from "../utils/dbUtils.js";
import ResponseHelper from "../utils/responseHelper.js";
import logger from "../utils/logger.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Schemas
import { createFolderSchema, renameFolderSchema, moveFolderSchema } from "../schemas/folder.schema.js";

/**
 * @desc    Get all folders for current user
 * @route   GET /api/v1/folders
 */
export const getFolders = asyncHandler(async (req, res) => {
  let parentId = req.query.parent;
  if (parentId === "null" || !parentId) {
    parentId = null;
  }

  const search = req.query.search || null;
  const query = { user: req.user.id };

  if (search) {
    query.name = { $regex: search, $options: "i" };
    if (parentId) {
      query.parent = parentId;
    }
  } else {
    query.parent = parentId;
  }

  const folders = await Folder.find(query);

  return ResponseHelper.success(res, folders, StatusCodes.OK, { count: folders.length });
});

/**
 * @desc    Get single folder details
 * @route   GET /api/v1/folders/:id
 */
export const getFolderDetails = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const current = folder;
  const parents = [];
  let pId = current.parent;

  while (pId) {
    const parent = await Folder.findById(pId);
    if (!parent) {
      break;
    }
    parents.unshift({ id: parent._id, name: parent.name });
    pId = parent.parent;
  }

  const fullBreadcrumbs = [...parents, { id: folder._id, name: folder.name }];

  return ResponseHelper.success(res, { ...folder.toObject(), breadcrumbs: fullBreadcrumbs });
});

/**
 * @desc    Create folder
 * @route   POST /api/v1/folders
 */
export const createFolder = asyncHandler(async (req, res) => {
  createFolderSchema.parse({ body: req.body });

  const { name, parent } = req.body;

  let folderPath = "/";
  if (parent) {
    const parentFolder = await Folder.findById(parent);
    if (!parentFolder) {
      return ResponseHelper.error(res, "Parent folder not found", StatusCodes.NOT_FOUND);
    }
    folderPath = parentFolder.path === "/" ? `/${parentFolder.name}` : `${parentFolder.path}/${parentFolder.name}`;
  }

  try {
    const folder = await Folder.create({
      name,
      user: req.user.id,
      parent: parent || null,
      path: folderPath,
    });

    SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
      action: "CREATE",
      folderId: folder._id,
      parentId: folder.parent,
    });

    return ResponseHelper.success(res, folder, StatusCodes.CREATED);
  } catch (err) {
    if (err.code === 11000) {
      return ResponseHelper.error(
        res,
        "Folder with this name already exists in this directory",
        StatusCodes.BAD_REQUEST
      );
    }
    throw err;
  }
});

/**
 * @desc    Get folder contents (both subfolders and files)
 * @route   GET /api/v1/folders/:id/contents
 */
export const getFolderContents = asyncHandler(async (req, res) => {
  const folderId = req.params.id === "root" ? null : req.params.id;

  const folders = await Folder.find({ user: req.user.id, parent: folderId });
  const files = await File.find({ user: req.user.id, folder: folderId, is_deleted: false });

  return ResponseHelper.success(res, { folders, files });
});

/**
 * @desc    Rename folder
 * @route   PATCH /api/v1/folders/:id
 */
export const renameFolder = asyncHandler(async (req, res) => {
  renameFolderSchema.parse({ body: req.body });

  const { name } = req.body;
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });

  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  try {
    folder.name = name;
    await folder.save();

    SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
      action: "RENAME",
      folderId: folder._id,
      name: folder.name,
    });

    return ResponseHelper.success(res, folder);
  } catch (err) {
    if (err.code === 11000) {
      return ResponseHelper.error(res, "Folder name conflict", StatusCodes.BAD_REQUEST);
    }
    throw err;
  }
});

/**
 * @desc    Delete folder (Soft delete)
 * @route   DELETE /api/v1/folders/:id
 */
export const deleteFolder = asyncHandler(async (req, res) => {
  await DbUtils.softDeleteRecursive("folder", req.params.id, req.user.id, true);

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "DELETE",
    folderId: req.params.id,
  });

  return ResponseHelper.success(res, {});
});

/**
 * @desc    Move folder
 * @route   POST /api/v1/folders/:id/move
 */
export const moveFolder = asyncHandler(async (req, res) => {
  moveFolderSchema.parse({ body: req.body });

  const { parentId } = req.body;
  const destParentId = parentId === "null" || !parentId ? null : parentId;

  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // Prevent moving folder into itself or its children
  if (destParentId) {
    if (destParentId === folder._id.toString()) {
      return ResponseHelper.error(res, "Cannot move folder into itself", StatusCodes.BAD_REQUEST);
    }

    let tempParentId = destParentId;
    while (tempParentId) {
      const tempParent = await Folder.findById(tempParentId);
      if (!tempParent || !tempParent.parent) {
        break;
      }
      if (tempParent.parent.toString() === folder._id.toString()) {
        return ResponseHelper.error(res, "Cannot move folder into one of its subfolders", StatusCodes.BAD_REQUEST);
      }
      tempParentId = tempParent.parent;
    }

    const destParent = await Folder.findById(destParentId);
    folder.path = destParent.path === "/" ? `/${destParent.name}` : `${destParent.path}/${destParent.name}`;
  } else {
    folder.path = "/";
  }

  folder.parent = destParentId;
  await folder.save();

  const updateChildPaths = async (pId, pPath, pName) => {
    const currentPath = pPath === "/" ? `/${pName}` : `${pPath}/${pName}`;
    const subfolders = await Folder.find({ parent: pId, user: req.user.id });
    for (const sub of subfolders) {
      sub.path = currentPath;
      await sub.save();
      await updateChildPaths(sub._id, sub.path, sub.name);
    }
  };

  await updateChildPaths(folder._id, folder.path, folder.name);

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "MOVE",
    folderId: folder._id,
    destParentId,
  });

  return ResponseHelper.success(res, folder);
});

/**
 * @desc    Copy folder (Recursive)
 * @route   POST /api/v1/folders/:id/copy
 */
export const copyFolder = asyncHandler(async (req, res) => {
  const { parentId } = req.body;
  const destParentId = parentId === "null" || !parentId ? null : parentId;

  const sourceFolder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!sourceFolder) {
    return ResponseHelper.error(res, "Folder not found", StatusCodes.NOT_FOUND);
  }

  const copyFolderRecursive = async (folderToCopy, newParentId) => {
    let newPath = "/";
    if (newParentId) {
      const parentFolder = await Folder.findById(newParentId);
      if (parentFolder) {
        newPath = parentFolder.path === "/" ? `/${parentFolder.name}` : `${parentFolder.path}/${parentFolder.name}`;
      }
    }

    const newFolder = await Folder.create({
      name: folderToCopy.name,
      user: req.user.id,
      parent: newParentId,
      path: newPath,
    });

    const files = await File.find({ folder: folderToCopy._id, user: req.user.id, is_deleted: false });
    const user = await User.findById(req.user.id);

    for (const file of files) {
      const newFileName = `${Date.now()}-${file.name}`;
      const destDir = FileService.getUserDir(req.user.id);
      const newStoragePath = path.join(destDir, newFileName);

      try {
        if (fs.existsSync(file.storage_path)) {
          fs.copyFileSync(file.storage_path, newStoragePath);
          await File.create({
            name: file.name,
            original_name: file.original_name,
            user: req.user.id,
            folder: newFolder._id,
            mime_type: file.mime_type,
            size_bytes: file.size_bytes,
            storage_path: newStoragePath,
            thumbnail_path: file.thumbnail_path,
          });
          user.used_bytes += file.size_bytes;
        }
      } catch (e) {
        logger.error(`Failed to copy file ${file._id}:`, e);
      }
    }
    await user.save();

    const subfolders = await Folder.find({ parent: folderToCopy._id, user: req.user.id });
    for (const sub of subfolders) {
      await copyFolderRecursive(sub, newFolder._id);
    }

    return newFolder;
  };

  await copyFolderRecursive(sourceFolder, destParentId);

  return ResponseHelper.success(res, { message: "Folder copied successfully" });
});
