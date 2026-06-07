import mongoose from "mongoose";

// Config
import Env from "#config/env.js";

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
    extension: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["image", "video", "audio", "document", "archive", "other"],
      default: "other",
    },
    size_bytes: {
      type: Number,
      required: true,
    },
    storage_path: {
      type: String,
      required: true,
    },
    encryption_iv: {
      type: String,
      required: true,
    },
    thumbnail_path: {
      type: String,
      default: null,
    },
    thumbnail_iv: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
    is_orphaned: {
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
    // Advanced Media Fields
    taken_at: {
      type: Date,
      default: null,
    },
    gps: {
      lat: Number,
      lng: Number,
    },
    audio_metadata: {
      artist: String,
      album: String,
      title: String,
      genre: String,
      year: Number,
    },
    hash: {
      type: String,
      index: true,
    },
    integrity_hmac: {
      type: String,
      select: false,
    },
    last_opened_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals for URLs
fileSchema.virtual("thumbnail_url").get(function () {
  const thumbnailCategories = new Set(["image", "video", "audio"]);
  if (!thumbnailCategories.has(this.category)) {
    return null;
  }
  return `${Env.APP_BASE_URL}/api/v1/files/${this._id}/preview?thumbnail=true`;
});

fileSchema.virtual("preview_url").get(function () {
  // Only return a preview URL for media files
  const mediaCategories = new Set(["image", "video", "audio"]);
  if (!mediaCategories.has(this.category)) {
    return null;
  }
  return `${Env.APP_BASE_URL}/api/v1/files/${this._id}/preview`;
});

fileSchema.virtual("original_url").get(function () {
  return `${Env.APP_BASE_URL}/api/v1/files/${this._id}/download`;
});

fileSchema.virtual("stream_url").get(function () {
  const mediaCategories = new Set(["video", "audio"]);
  if (!mediaCategories.has(this.category)) {
    return null;
  }
  return `${Env.APP_BASE_URL}/api/v1/files/${this._id}/stream`;
});

// Indexes
// ── Compound indexes (high-priority — cover the most common query shapes) ──────
// Almost every query filters on { user, is_deleted } — these two fields together
// are the single most important compound index on this collection.
fileSchema.index({ user: 1, is_deleted: 1 });
// File listing inside a folder (the default "browse" view)
fileSchema.index({ user: 1, folder: 1, is_deleted: 1 });
// Favorites listing sorted by when the file was favorited
fileSchema.index({ user: 1, is_favorite: 1, favorited_at: -1 });
// Recent-files endpoint sorts by last_opened_at scoped to a user
fileSchema.index({ user: 1, last_opened_at: -1 });
// Name search ($regex) — scoping to user first reduces the scan range significantly
fileSchema.index({ user: 1, name: 1 });
// ── Single-field indexes (secondary lookups & filters) ──────────────────────────
fileSchema.index({ category: 1 });
fileSchema.index({ extension: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ createdAt: -1 });

export default mongoose.model("File", fileSchema);
