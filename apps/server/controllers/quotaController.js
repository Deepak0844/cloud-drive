// Services
import QuotaService from "#services/quotaService.js";

// Constants
import { SuccessMessages } from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

export const getQuotaUsage = asyncHandler(async (req, res) => {
  const data = await QuotaService.getQuotaUsage(req.user.id);
  return ResponseUtils.success(res, data);
});

export const getQuotaBreakdown = asyncHandler(async (req, res) => {
  const result = await QuotaService.getQuotaBreakdown(req.user.id);
  return ResponseUtils.success(res, result);
});

export const requestQuotaIncrease = asyncHandler(async (req, res) => {
  const { requested_bytes, reason } = req.body;
  const quotaRequest = await QuotaService.requestQuotaIncrease(req.user.id, requested_bytes, reason);
  return ResponseUtils.success(res, quotaRequest, HttpStatus.OK, { message: SuccessMessages.QUOTA_REQUEST_SUBMITTED });
});
