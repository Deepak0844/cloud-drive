// Services
import AdminService from "#services/adminService.js";
import FileService from "#services/fileService.js";
import SocketService from "#services/socketService.js";
import SystemService from "#services/systemService.js";

// Constants
import { SocketEvents, SuccessMessages } from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

export const getUsers = asyncHandler(async (req, res) => {
  const result = await AdminService.getUsers(req.user.id, req.query);
  return ResponseUtils.success(res, result);
});

export const updateUserQuota = asyncHandler(async (req, res) => {
  const user = await AdminService.updateUserQuota(req.params.id, req.body.quota_bytes);
  return ResponseUtils.success(res, user);
});

export const getSystemStats = asyncHandler(async (req, res) => {
  const [hardware, dashboard] = await Promise.all([
    SystemService.getHardwareStats(),
    SystemService.getDashboardStats(),
  ]);
  return ResponseUtils.success(res, { system: hardware, ...dashboard });
});

export const getAllQuotaRequests = asyncHandler(async (req, res) => {
  const result = await AdminService.getAllQuotaRequests(req.query);
  return ResponseUtils.success(res, result);
});

export const handleQuotaRequest = asyncHandler(async (req, res) => {
  const request = await AdminService.handleQuotaRequest(req.params.id, req.body.status, req.body.admin_note);
  return ResponseUtils.success(res, request);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await AdminService.updateUserStatus(req.params.id, req.body.is_active);
  return ResponseUtils.success(res, user);
});

export const runStorageReanalysis = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const summary = await FileService.deepSyncStorage(userId);
  SocketService.emitToAdmins(SocketEvents.STORAGE_SYNC_COMPLETE, { ...summary, targetUserId: userId });
  return ResponseUtils.success(res, summary, HttpStatus.OK, {
    message: userId
      ? `Deep storage re-analysis for user ${userId} completed successfully`
      : SuccessMessages.STORAGE_ANALYSIS_COMPLETE,
  });
});
