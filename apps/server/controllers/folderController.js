// Models
import Folder from "#models/Folder.js";
import File from "#models/File.js";

// Constants
import { ErrorMessages } from "#constants/generalConstants.js";
import { HttpStatus, ItemTypes } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import { applyAdvancedFilters } from "#utils/filterUtils.js";
import DbUtils from "#utils/dbUtils.js";
import FolderUtils from "#utils/folderUtils.js";

// Services
import SocketService from "#services/socketService.js";

/**
 * @desc    Get all folders for current user
 * @route   GET /api/v1/folders
 * @access  Private
 */
export const getFolders = asyncHandler(async (req, res) => {
  const { search, parentId, isFavorite } = req.query;

  let query = { user: req.user.id, is_deleted: false };

  if (search && search !== "null" && search !== "undefined") {
    query.name = { $regex: search, $options: "i" };
  }

  const isFav = isFavorite === "true" || isFavorite === true;

  if (isFav) {
    query.is_favorite = true;
  }

  if (parentId !== undefined) {
    query.parent = parentId;
  } else if (!isFav && (!search || search === "null" || search === "undefined")) {
    // Default to root only if not looking for favorites or searching globally
    query.parent = null;
  }

  query = applyAdvancedFilters(query, req.query, true);

  let sort = "name";
  if (isFav) {
    sort = "-favorited_at";
  }

  const folders = await Folder.find(query).sort(sort);
  return ResponseUtils.success(res, folders);
});

// ... existing controllers ...

/**
 * @desc    Update folder tags
 * @route   PATCH /api/v1/folders/:id/tags
 * @access  Private
 */
export const updateFolderTags = asyncHandler(async (req, res) => {
  const { tags } = req.body;
  const folder = await Folder.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { tags }, { new: true });

  if (!folder) {
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return ResponseUtils.success(res, folder);
});

/**
 * @desc    Get folder contents
 * @route   GET /api/v1/folders/:id/contents
 * @access  Private
 */
export const getFolderContents = asyncHandler(async (req, res) => {
  const folderId = req.params.id === "root" ? null : req.params.id;
  const { search, sortBy, sortOrder = "asc" } = req.query;

  // Build folder query
  let folderQuery = { user: req.user.id, is_deleted: false };
  if (search && search !== "null" && search !== "undefined") {
    folderQuery.name = { $regex: search, $options: "i" };
  } else {
    folderQuery.parent = folderId;
  }
  folderQuery = applyAdvancedFilters(folderQuery, req.query, true);

  // Build file query
  let fileQuery = { user: req.user.id, is_deleted: false };
  if (search && search !== "null" && search !== "undefined") {
    fileQuery.name = { $regex: search, $options: "i" };
  } else {
    fileQuery.folder = folderId;
  }
  fileQuery = applyAdvancedFilters(fileQuery, req.query, false);

  const pg = Math.max(1, parseInt(req.query.pg) || 1);
  const ps = Math.max(1, Math.min(100, parseInt(req.query.ps) || 20));
  const skip = (pg - 1) * ps;

  const sortDirection = sortOrder === "desc" ? -1 : 1;
  let fileSort = { createdAt: -1 };
  let folderSort = { name: 1 };

  if (sortBy) {
    if (sortBy === "name") {
      fileSort = { name: sortDirection };
      folderSort = { name: sortDirection };
    } else if (sortBy === "size") {
      fileSort = { size_bytes: sortDirection };
      folderSort = { name: sortDirection }; // Folders don't have size normally
    } else if (sortBy === "updatedAt") {
      fileSort = { updatedAt: sortDirection };
      folderSort = { updatedAt: sortDirection };
    } else if (sortBy === "createdAt") {
      fileSort = { createdAt: sortDirection };
      folderSort = { createdAt: sortDirection };
    }
  }

  // Get total counts for both
  const [totalFolders, totalFiles] = await Promise.all([
    Folder.countDocuments(folderQuery),
    File.countDocuments(fileQuery),
  ]);

  const totalItems = totalFolders + totalFiles;
  const totalPages = Math.ceil(totalItems / ps);

  let folders = [];
  let files = [];

  // Logic to determine how many folders and files to fetch for the current page
  if (skip < totalFolders) {
    // Current page starts within or at folders
    const folderLimit = Math.min(ps, totalFolders - skip);
    folders = await Folder.find(folderQuery).sort(folderSort).skip(skip).limit(folderLimit);

    // If there's still room in the page, fill with files
    if (folders.length < ps && totalFiles > 0) {
      const fileLimit = ps - folders.length;
      files = await File.find(fileQuery).sort(fileSort).limit(fileLimit);
    }
  } else {
    // Current page starts within files
    const fileSkip = skip - totalFolders;
    files = await File.find(fileQuery).sort(fileSort).skip(fileSkip).limit(ps);
  }

  // Dynamically resolve itemCount for each folder
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const fileCount = await File.countDocuments({ folder: folder._id, is_deleted: false });
      const subfolderCount = await Folder.countDocuments({ parent: folder._id, is_deleted: false });
      return {
        ...folder.toObject(),
        id: folder._id,
        itemCount: fileCount + subfolderCount,
      };
    })
  );

  return ResponseUtils.success(res, {
    folders: foldersWithCount,
    files,
    pagination: {
      total: totalItems,
      page: pg,
      ps,
      pages: totalPages,
      hasNext: pg < totalPages,
      hasPrev: pg > 1,
      totalFolders,
      totalFiles,
    },
  });
});

/**
 * @desc    Get folder details
 * @route   GET /api/v1/folders/:id
 * @access  Private
 */
export const getFolderDetails = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!folder) {
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  // Get breadcrumbs
  const fullBreadcrumbs = await FolderUtils.generateBreadcrumbs(folder);

  return ResponseUtils.success(res, { ...folder.toObject(), breadcrumbs: fullBreadcrumbs });
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
    return ResponseUtils.error(res, error.message, HttpStatus.NOT_FOUND);
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

    return ResponseUtils.success(res, folder, HttpStatus.CREATED);
  } catch (err) {
    if (err.code === 11000) {
      return ResponseUtils.error(res, ErrorMessages.FOLDER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
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
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "RENAME",
    folderId: folder._id,
    name: folder.name,
  });

  return ResponseUtils.success(res, folder);
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
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "MOVE",
    folderId: folder._id,
    destParentId: parentId,
  });

  return ResponseUtils.success(res, folder);
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
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  // HEAD did not have socket event for copyFolder, so omitting it to confirm exact restoration/behavior

  return ResponseUtils.success(res, newFolder);
});

/**
 * @desc    Soft delete folder (and contents)
 * @route   DELETE /api/v1/folders/:id
 * @access  Private
 */
export const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });

  if (!folder) {
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  await DbUtils.softDeleteRecursive(ItemTypes.FOLDER, req.params.id, req.user.id, true);

  SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
    action: "DELETE",
    folderId: req.params.id,
  });

  return ResponseUtils.success(res, { message: "Folder and its contents moved to trash" });
});
/**
 * @desc    Toggle favorite status for folder
 * @route   PATCH /api/v1/folders/:id/favorite
 * @access  Private
 */
export const toggleFavorite = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });

  if (!folder) {
    return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  folder.is_favorite = !folder.is_favorite;
  folder.favorited_at = folder.is_favorite ? new Date() : null;
  await folder.save();

  return ResponseUtils.success(res, folder);
});
