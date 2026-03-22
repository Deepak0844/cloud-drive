import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a folder name"],
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    path: {
      type: String,
      required: true,
      default: "/",
    },
    is_favorite: {
      type: Boolean,
      default: false,
    },
    favorited_at: {
      type: Date,
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
    original_parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

// Indexes
// Unique constraint: a user cannot have two folders with the same name in the same parent
folderSchema.index({ name: 1, user: 1, parent: 1 }, { unique: true });
// Most folder queries filter on { user, is_deleted } — this compound index is essential
folderSchema.index({ user: 1, is_deleted: 1 });
// Browsing a folder's immediate children (the dominant read pattern)
folderSchema.index({ user: 1, parent: 1, is_deleted: 1 });
folderSchema.index({ tags: 1 });

export default mongoose.model("Folder", folderSchema);
