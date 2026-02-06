// Constants
import ErrorMessages from "../constants/errorMessages";
import StatusCodes from "../constants/statusCodes";

// Models
import User from "../models/User";
import QuotaRequest from "../models/QuotaRequest";

/**
 * @desc    Get current quota usage
 * @route   GET /api/v1/quota/usage
 * @access  Private
 */
export async function getQuotaUsage(req, res) {
  try {
    const user = await User.findById(req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        quota_bytes: user.quota_bytes,
        used_bytes: user.used_bytes,
        percentage: (user.used_bytes / user.quota_bytes) * 100,
      },
    });
  } catch (err) {
    console.error("Error getting quota usage:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Request quota increase
 * @route   POST /api/v1/quota/request
 * @access  Private
 */
export async function requestQuotaIncrease(req, res) {
  try {
    const { requested_bytes, reason } = req.body;

    if (!requested_bytes) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide requested bytes",
      });
    }

    // Check if there is already a pending request
    const existingRequest = await QuotaRequest.findOne({ user: req.user.id, status: "PENDING" });
    if (existingRequest) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "You already have a pending quota request",
      });
    }

    const quotaRequest = await QuotaRequest.create({
      user: req.user.id,
      requested_bytes,
      reason,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: quotaRequest,
      message: "Quota request submitted successfully.",
    });
  } catch (err) {
    console.error("Error requesting quota increase:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
