// Models
import Folder from "../models/Folder.js";
import File from "../models/File.js";

// Constants
import { ErrorMessages, StatusCodes, ItemTypes } from "../constants/generalConstants.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import DbUtils from "../utils/dbUtils.js";
import FolderUtils from "../utils/folderUtils.js";

// Services
import SocketService from "../services/socket.service.js";

/**
 * @desc    Get all folders for current user
 * @route   GET /api/v1/folders
 * @access  Private
 */
export const getFolders = asyncHandler(async (req, res) => {
  const { search, parentId } = req.query;

  const query = { user: req.user.id, is_deleted: false };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (parentId !== undefined) {
    query.parent = parentId;
  }

  const folders = await Folder.find(query).sort("name");
  return ResponseHelper.success(res, folders);
});

/**
 * @desc    Get folder contents
 * @route   GET /api/v1/folders/:id/contents
 * @access  Private
 */
export const getFolderContents = asyncHandler(async (req, res) => {
  const folderId = req.params.id === "root" ? null : req.params.id;

  const folders = await Folder.find({ user: req.user.id, parent: folderId, is_deleted: false }).sort("name");
  const files = await File.find({ user: req.user.id, folder: folderId, is_deleted: false }).sort("-createdAt");

  return ResponseHelper.success(res, { folders, files });
});

/**
 * @desc    Get folder details
 * @route   GET /api/v1/folders/:id
 * @access  Private
 */
export const getFolderDetails = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // Get breadcrumbs
  const fullBreadcrumbs = await FolderUtils.generateBreadcrumbs(folder);

  return ResponseHelper.success(res, { ...folder.toObject(), breadcrumbs: fullBreadcrumbs });
});

/**
 * @desc    Create new folder
 * @route   POST /api/v1/folders
 * @access  Private
 */
export const createFolder = asyncHandler(async (req, res) => {
  const { name, parent } = req.body;

  // Calculate folder path
  let folderPath;
  try {
    folderPath = await FolderUtils.calculateFolderPath(parent);
  } catch (error) {
    return ResponseHelper.error(res, error.message, StatusCodes.NOT_FOUND);
  }

  try {
    const folder = await Folder.create({
      user: req.user.id,
      name,
      parent: parent,
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
      return ResponseHelper.error(res, ErrorMessages.FOLDER_ALREADY_EXISTS, StatusCodes.BAD_REQUEST);
    }
    throw err;
  }
});

/**
 * @desc    Rename folder
 * @route   PATCH /api/v1/folders/:id
 * @access  Private
 */
export const renameFolder = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const folder = await Folder.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { name }, { new: true });

  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "RENAME",
    folderId: folder._id,
    name: folder.name,
  });

  return ResponseHelper.success(res, folder);
});

/**
 * @desc    Move folder
 * @route   POST /api/v1/folders/:id/move
 * @access  Private
 */
export const moveFolder = asyncHandler(async (req, res) => {
  const { parentId } = req.body;

  const folder = await DbUtils.moveItem(ItemTypes.FOLDER, req.params.id, parentId, req.user.id);

  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "MOVE",
    folderId: folder._id,
    destParentId: parentId,
  });

  return ResponseHelper.success(res, folder);
});

/**
 * @desc    Copy folder (Recursive)
 * @route   POST /api/v1/folders/:id/copy
 * @access  Private
 */
export const copyFolder = asyncHandler(async (req, res) => {
  const { parentId } = req.body; // Reverted to 'parentId'

  const newFolder = await DbUtils.copyRecursive(ItemTypes.FOLDER, req.params.id, parentId, req.user.id);

  if (!newFolder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // HEAD did not have socket event for copyFolder, so omitting it to confirm exact restoration/behavior

  return ResponseHelper.success(res, newFolder);
});

/**
 * @desc    Soft delete folder (and contents)
 * @route   DELETE /api/v1/folders/:id
 * @access  Private
 */
export const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });

  if (!folder) {
    return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  await DbUtils.softDeleteRecursive(ItemTypes.FOLDER, req.params.id, req.user.id, true);

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "DELETE",
    folderId: req.params.id,
  });

  return ResponseHelper.success(res, { message: "Folder and its contents moved to trash" });
});
