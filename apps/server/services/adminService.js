// Models
import QuotaRequest from "#models/QuotaRequest.js";
import User from "#models/User.js";

// Services
import NotificationService from "#services/notificationService.js";
import SocketService from "#services/socketService.js";

// Constants
import { ErrorMessages, NotificationMessages, SocketEvents } from "#constants/generalConstants.js";
import { HttpStatus, NotificationTypes, QuotaStatus } from "@shared-constants/constants";

// Utils
import { AppError } from "#utils/errorUtils.js";
import FormatUtils from "#utils/formatUtils.js";
import { paginateQuery } from "#utils/paginationUtils.js";

// ─── Service Functions ────────────────────────────────────────────────────────

async function getUsers(adminId, queryParams) {
  const { pg, ps, search } = queryParams;
  const queryFilter = { _id: { $ne: adminId } };

  if (search) {
    const escaped = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    queryFilter.$or = [{ name: regex }, { email: regex }];
  }

  return paginateQuery(User, queryFilter, { pg, ps, sort: "name", select: "-password" });
}

async function updateUserQuota(userId, quota_bytes) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const isIncrease = quota_bytes > user.quota_bytes;
  user.quota_bytes = quota_bytes;
  await user.save();

  await NotificationService.createNotification(
    user._id,
    NotificationTypes.QUOTA_CHANGE,
    isIncrease ? NotificationMessages.QUOTA_INCREASED : NotificationMessages.QUOTA_DECREASED,
    `Your storage quota has been ${isIncrease ? "increased" : "decreased"} to ${FormatUtils.bytesToGB(quota_bytes)} GB`
  );

  SocketService.emitToUser(String(user._id), SocketEvents.QUOTA_UPDATE, {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  return user;
}

async function handleQuotaRequest(requestId, status, admin_note) {
  const request = await QuotaRequest.findById(requestId);
  if (!request) {
    throw new AppError(ErrorMessages.QUOTA_REQUEST_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (request.status !== QuotaStatus.PENDING) {
    throw new AppError(ErrorMessages.REQUEST_ALREADY_PROCESSED, HttpStatus.BAD_REQUEST);
  }

  request.status = status;
  request.admin_note = admin_note;
  await request.save();

  const user = await User.findById(request.user);
  if (!user) {
    throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (status === QuotaStatus.APPROVED) {
    user.quota_bytes += request.requested_bytes;
    await user.save();

    await NotificationService.createNotification(
      user._id,
      NotificationTypes.QUOTA_APPROVED,
      NotificationMessages.QUOTA_REQUEST_APPROVED,
      `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been approved.`
    );

    SocketService.emitToUser(String(user._id), SocketEvents.NOTIFICATION, {
      type: NotificationTypes.QUOTA_APPROVED,
      title: NotificationMessages.QUOTA_REQUEST_APPROVED,
      message: `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been approved.`,
    });
  } else {
    await NotificationService.createNotification(
      user._id,
      NotificationTypes.QUOTA_REJECTED,
      NotificationMessages.QUOTA_REQUEST_REJECTED,
      `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been rejected.`
    );

    SocketService.emitToUser(String(user._id), SocketEvents.NOTIFICATION, {
      type: NotificationTypes.QUOTA_REJECTED,
      title: NotificationMessages.QUOTA_REQUEST_REJECTED,
      message: `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been rejected.`,
    });
  }

  SocketService.emitToUser(String(user._id), SocketEvents.QUOTA_UPDATE, {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  await request.populate("user", "name email");
  return request;
}

async function updateUserStatus(userId, is_active) {
  const user = await User.findByIdAndUpdate(userId, { is_active }, { new: true });
  if (!user) {
    throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return user;
}

async function getAllQuotaRequests(queryParams) {
  const { pg, ps } = queryParams;
  return paginateQuery(QuotaRequest, {}, { pg, ps, sort: "-createdAt", populate: "user" });
}

const AdminService = {
  getUsers,
  updateUserQuota,
  handleQuotaRequest,
  updateUserStatus,
  getAllQuotaRequests,
};

export default AdminService;
