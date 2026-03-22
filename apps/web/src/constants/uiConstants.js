/**
 * UI Colors — web-only display constants for status badges and role tags.
 */
export const UI_COLORS = {
  STATUS: {
    APPROVED: "green",
    REJECTED: "red",
    PENDING: "blue",
  },
  ROLES: {
    ADMIN: "gold",
    USER: "blue",
  },
};

/**
 * File category display config (color + label only — no JSX).
 * Icon rendering is done at the call site using lucide-react imports.
 * Used in the SettingsPage quota breakdown section.
 */
export const CATEGORY_CONFIG = {
  image: { color: "var(--chart-1)", label: "Images" },
  video: { color: "var(--chart-2)", label: "Videos" },
  audio: { color: "var(--chart-3)", label: "Audio" },
  document: { color: "var(--chart-4)", label: "Documents" },
  archive: { color: "var(--chart-5)", label: "Archives" },
  other: { color: "var(--text-tertiary)", label: "Other" },
};

/**
 * View mode values shared by list pages (grid / list).
 */
export const VIEW_MODES = {
  GRID: "grid",
  LIST: "list",
};

/**
 * Time-group section labels for the Recent page.
 */
export const TIME_LABELS = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  EARLIER: "Earlier",
};

/**
 * Fallback chunk size (10 MB) used when UPLOAD_CHUNK_SIZE is unavailable.
 */
export const DEFAULT_CHUNK_SIZE = 10 * 1_000 * 1_000;

/**
 * URL search-param keys specific to the Admin Dashboard page.
 */
export const ADMIN_QUERY_PARAMS = {
  TAB: "tab",
  USER_PAGE: "up",
  REQUEST_PAGE: "rp",
};
