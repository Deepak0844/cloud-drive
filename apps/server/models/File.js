import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a file name"],
      trim: true,
    },
    original_name: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    mime_type: {
      type: String,
      required: true,
    },
    size_bytes: {
      type: Number,
      required: true,
    },
    storage_path: {
      type: String,
      required: true,
    },
    thumbnail_path: {
      type: String,
      default: null,
    },
    preview_path: {
      type: String,
      default: null,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    deleted_directly: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
fileSchema.index({ user: 1, folder: 1 });
fileSchema.index({ is_deleted: 1 });

export default mongoose.model("File", fileSchema);
