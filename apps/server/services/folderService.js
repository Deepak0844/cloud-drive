// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";

// Constants
import { ErrorMessages } from "#constants/generalConstants.js";
import { DefaultPagination, HttpStatus, ItemTypes } from "@shared-constants/constants";

// Utils
import DbUtils from "#utils/dbUtils.js";
import { AppError } from "#utils/errorUtils.js";
import { applyAdvancedFilters, escapeRegex } from "#utils/filterUtils.js";
import FolderUtils from "#utils/folderUtils.js";

// ─── Service Functions ────────────────────────────────────────────────────────

async function getFolders(userId, queryParams) {
  const { search, parentId, isFavorite } = queryParams;

  let query = { user: userId, is_deleted: false };

  if (search && search !== "null" && search !== "undefined") {
    query.name = { $regex: escapeRegex(search), $options: "i" };
  }

  const isFav = isFavorite === "true" || isFavorite === true;
  if (isFav) {
    query.is_favorite = true;
  }

  if (parentId !== undefined) {
    query.parent = parentId;
  } else if (!isFav && (!search || search === "null" || search === "undefined")) {
    query.parent = null;
  }

  query = applyAdvancedFilters(query, queryParams, true);

  const sort = isFav ? "-favorited_at" : "name";
  return Folder.find(query).sort(sort);
}

async function getFolderContents(userId, folderId, queryParams) {
  const { search, sortBy, sortOrder = "asc" } = queryParams;
  const resolvedFolderId = folderId === "root" ? null : folderId;

  let folderQuery = { user: userId, is_deleted: false };
  if (search && search !== "null" && search !== "undefined") {
    folderQuery.name = { $regex: escapeRegex(search), $options: "i" };
  } else {
    folderQuery.parent = resolvedFolderId;
  }
  folderQuery = applyAdvancedFilters(folderQuery, queryParams, true);

  let fileQuery = { user: userId, is_deleted: false };
  if (search && search !== "null" && search !== "undefined") {
    fileQuery.name = { $regex: escapeRegex(search), $options: "i" };
  } else {
    fileQuery.folder = resolvedFolderId;
  }
  fileQuery = applyAdvancedFilters(fileQuery, queryParams, false);

  const pg = Math.max(1, parseInt(queryParams.pg) || 1);
  const ps = Math.max(
    1,
    Math.min(DefaultPagination.maxPageSize, parseInt(queryParams.ps) || DefaultPagination.pageSize)
  );
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
    } else if (sortBy === "updatedAt") {
      fileSort = { updatedAt: sortDirection };
      folderSort = { updatedAt: sortDirection };
    } else if (sortBy === "createdAt") {
      fileSort = { createdAt: sortDirection };
      folderSort = { createdAt: sortDirection };
    }
  }

  const [totalFolders, totalFiles] = await Promise.all([
    Folder.countDocuments(folderQuery),
    File.countDocuments(fileQuery),
  ]);

  const totalItems = totalFolders + totalFiles;
  const totalPages = Math.ceil(totalItems / ps);

  let folders = [];
  let files = [];

  if (skip < totalFolders) {
    const folderLimit = Math.min(ps, totalFolders - skip);
    folders = await Folder.find(folderQuery).sort(folderSort).skip(skip).limit(folderLimit);

    if (folders.length < ps && totalFiles > 0) {
      const fileLimit = ps - folders.length;
      files = await File.find(fileQuery).sort(fileSort).limit(fileLimit);
    }
  } else {
    const fileSkip = skip - totalFolders;
    files = await File.find(fileQuery).sort(fileSort).skip(fileSkip).limit(ps);
  }

  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const [fileCount, subfolderCount] = await Promise.all([
        File.countDocuments({ folder: folder._id, is_deleted: false }),
        Folder.countDocuments({ parent: folder._id, is_deleted: false }),
      ]);
      return { ...folder.toObject(), id: folder._id, itemCount: fileCount + subfolderCount };
    })
  );

  return {
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
  };
}

async function getFolderDetails(userId, folderId) {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  const breadcrumbs = await FolderUtils.generateBreadcrumbs(folder);
  return { ...folder.toObject(), breadcrumbs };
}

async function createFolder(userId, name, parentId) {
  if (parentId) {
    const parentFolder = await Folder.findOne({ _id: parentId, user: userId, is_deleted: false });
    if (!parentFolder) {
      throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  const folderPath = await FolderUtils.calculateFolderPath(parentId);
  return Folder.create({ user: userId, name, parent: parentId, path: folderPath });
}

async function renameFolder(userId, folderId, name) {
  const folder = await Folder.findOneAndUpdate({ _id: folderId, user: userId }, { name }, { new: true });
  if (!folder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return folder;
}

async function moveFolder(userId, folderId, parentId) {
  const folder = await DbUtils.moveItem(ItemTypes.FOLDER, folderId, parentId, userId);
  if (!folder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return folder;
}

async function copyFolder(userId, folderId, parentId) {
  const newFolder = await DbUtils.copyRecursive(ItemTypes.FOLDER, folderId, parentId, userId);
  if (!newFolder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return newFolder;
}

async function deleteFolder(userId, folderId) {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  await DbUtils.softDeleteRecursive(ItemTypes.FOLDER, folderId, userId, true);
}

async function toggleFavorite(userId, folderId) {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  folder.is_favorite = !folder.is_favorite;
  folder.favorited_at = folder.is_favorite ? new Date() : null;
  await folder.save();
  return folder;
}

async function updateFolderTags(userId, folderId, tags) {
  const folder = await Folder.findOneAndUpdate({ _id: folderId, user: userId }, { tags }, { new: true });
  if (!folder) {
    throw new AppError(ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return folder;
}

const FolderService = {
  getFolders,
  getFolderContents,
  getFolderDetails,
  createFolder,
  renameFolder,
  moveFolder,
  copyFolder,
  deleteFolder,
  toggleFavorite,
  updateFolderTags,
};

export default FolderService;
