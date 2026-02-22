import mongoose from "mongoose";

// Constants
import { QuotaStatus } from "../constants/generalConstants.js";

const quotaRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requested_bytes: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(QuotaStatus),
      default: QuotaStatus.PENDING,
    },
    admin_note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("QuotaRequest", quotaRequestSchema);
