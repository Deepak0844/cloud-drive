// Constants for Cloud Drive

export const STORAGE = {
  TOTAL_QUOTA_GB: 2,
  MAX_FILE_SIZE_MB: 100,
  WARN_THRESHOLD_PERCENT: 80,
  DANGER_THRESHOLD_PERCENT: 95,
};

export const MOCK_DATA = {
  FOLDERS: [
    { id: "1", name: "Work Project", itemCount: 12 },
    { id: "2", name: "Personal Photos", itemCount: 154 },
    { id: "3", name: "Documents", itemCount: 8 },
    { id: "4", name: "Videos", itemCount: 3 },
  ],
  FILES: [
    { id: "a", name: "Presentation.pdf", type: "pdf", size: "2.4 MB" },
    { id: "b", name: "Selfie.jpg", type: "image", size: "1.2 MB" },
    { id: "c", name: "Notes.txt", type: "text", size: "45 KB" },
    { id: "d", name: "Dashboard_Design.png", type: "image", size: "4.8 MB" },
    { id: "e", name: "Invoice_Jan.pdf", type: "pdf", size: "150 KB" },
  ],
  USERS: [
    {
      _id: "1",
      name: "John Doe",
      email: "john@example.com",
      role: "USER",
      is_active: true,
      used_bytes: 1.5 * 1024 * 1024 * 1024,
      quota_bytes: 2 * 1024 * 1024 * 1024,
    },
    {
      _id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      role: "USER",
      is_active: false,
      used_bytes: 5 * 1024 * 1024 * 1024,
      quota_bytes: 10 * 1024 * 1024 * 1024,
    },
    {
      _id: "3",
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      is_active: true,
      used_bytes: 0,
      quota_bytes: 0,
    },
  ],
  REQUESTS: [
    {
      _id: "r1",
      user: { name: "John Doe", email: "john@example.com" },
      requested_bytes: 5 * 1024 * 1024 * 1024,
      reason: "Need space for video projects",
      status: "PENDING",
      createdAt: "2023-10-15T10:00:00Z",
    },
    {
      _id: "r2",
      user: { name: "Jane Smith", email: "jane@example.com" },
      requested_bytes: 20 * 1024 * 1024 * 1024,
      reason: "Backup files",
      status: "APPROVED",
      createdAt: "2023-10-10T14:30:00Z",
    },
  ],
};

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
