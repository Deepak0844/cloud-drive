// Services
import FolderService from "#services/folderService.js";
import SocketService from "#services/socketService.js";

// Constants
import { SocketActions, SocketEvents, SuccessMessages } from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

export const getFolders = asyncHandler(async (req, res) => {
  const folders = await FolderService.getFolders(req.user.id, req.query);
  return ResponseUtils.success(res, folders, HttpStatus.OK, SuccessMessages.FOLDERS_LOADED);
});

export const getFolderContents = asyncHandler(async (req, res) => {
  const result = await FolderService.getFolderContents(req.user.id, req.params.id, req.query);
  return ResponseUtils.success(res, result, HttpStatus.OK, SuccessMessages.FOLDER_CONTENTS_LOADED);
});

export const getFolderDetails = asyncHandler(async (req, res) => {
  const folder = await FolderService.getFolderDetails(req.user.id, req.params.id);
  return ResponseUtils.success(res, folder, HttpStatus.OK, SuccessMessages.FOLDER_LOADED);
});

export const createFolder = asyncHandler(async (req, res) => {
  const { name, parent } = req.body;
  const folder = await FolderService.createFolder(req.user.id, name, parent);
  SocketService.emitToUser(req.user.id, SocketEvents.FOLDER_CHANGE, {
    action: SocketActions.CREATE,
    folderId: folder._id,
    parentId: folder.parent,
  });
  return ResponseUtils.success(res, folder, HttpStatus.CREATED, SuccessMessages.FOLDER_CREATED);
});

export const renameFolder = asyncHandler(async (req, res) => {
  const folder = await FolderService.renameFolder(req.user.id, req.params.id, req.body.name);
  SocketService.emitToUser(req.user.id, SocketEvents.FOLDER_CHANGE, {
    action: SocketActions.RENAME,
    folderId: folder._id,
    name: folder.name,
  });
  return ResponseUtils.success(res, folder, HttpStatus.OK, SuccessMessages.FOLDER_RENAMED);
});

export const moveFolder = asyncHandler(async (req, res) => {
  const folder = await FolderService.moveFolder(req.user.id, req.params.id, req.body.parentId);
  SocketService.emitToUser(req.user.id, SocketEvents.FOLDER_CHANGE, {
    action: SocketActions.MOVE,
    folderId: folder._id,
    destParentId: req.body.parentId,
  });
  return ResponseUtils.success(res, folder, HttpStatus.OK, SuccessMessages.FOLDER_MOVED);
});

export const copyFolder = asyncHandler(async (req, res) => {
  const newFolder = await FolderService.copyFolder(req.user.id, req.params.id, req.body.parentId);
  return ResponseUtils.success(res, newFolder, HttpStatus.OK, SuccessMessages.FOLDER_COPIED);
});

export const deleteFolder = asyncHandler(async (req, res) => {
  await FolderService.deleteFolder(req.user.id, req.params.id);
  SocketService.emitToUser(req.user.id, SocketEvents.FOLDER_CHANGE, {
    action: SocketActions.DELETE,
    folderId: req.params.id,
  });
  return ResponseUtils.success(
    res,
    { message: SuccessMessages.FOLDER_DELETED },
    HttpStatus.OK,
    SuccessMessages.FOLDER_DELETED
  );
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const folder = await FolderService.toggleFavorite(req.user.id, req.params.id);
  return ResponseUtils.success(res, folder, HttpStatus.OK, SuccessMessages.FAVORITE_TOGGLED);
});

export const updateFolderTags = asyncHandler(async (req, res) => {
  const folder = await FolderService.updateFolderTags(req.user.id, req.params.id, req.body.tags);
  return ResponseUtils.success(res, folder, HttpStatus.OK, SuccessMessages.FOLDER_TAGS_UPDATED);
});
