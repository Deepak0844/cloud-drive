import { jest } from "@jest/globals";

// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";
import Notification from "#models/Notification.js";

// Services
import TrashService from "#services/trashService.js";
import EmailService from "#services/emailService.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser } from "#test-helpers/auth.helper.js";

// Mock EmailService
jest.mock("../../services/emailService.js", () => ({
  sendTemplateEmail: jest.fn().mockResolvedValue(true),
  sendEmail: jest.fn().mockResolvedValue(true),
}));

describe("Smart Trash Cleanup Integration", () => {
  let user;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await resetTests();
    user = await createTestUser();

    // Spies for EmailService
    jest.spyOn(EmailService, "sendTemplateEmail").mockResolvedValue(true);
    jest.spyOn(EmailService, "sendEmail").mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should permanently delete items older than 30 days and notify the user", async () => {
    // 1. Create an expired file (deleted 31 days ago)
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 31);

    const expiredFile = await File.create({
      name: "expired.txt",
      original_name: "expired.txt",
      size_bytes: 1024 * 1024 * 5, // 5 MB
      user: user._id,
      is_deleted: true,
      deleted_directly: true,
      deleted_at: expiredDate,
      storage_path: "/tmp/expired.txt",
      mime_type: "text/plain",
      encryption_iv: "iv1",
    });

    // 2. Create a recent trashed file (should NOT be deleted)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    const recentFile = await File.create({
      name: "recent.txt",
      original_name: "recent.txt",
      size_bytes: 1024,
      user: user._id,
      is_deleted: true,
      deleted_directly: true,
      deleted_at: recentDate,
      storage_path: "/tmp/recent.txt",
      mime_type: "text/plain",
      encryption_iv: "iv2",
    });

    // 3. Run the cleanup service
    await TrashService.autoPurgeExpiredItems();

    // 4. Verify results
    const remainingFiles = await File.find({ user: user._id });
    const remainingIds = remainingFiles.map((f) => f._id.toString());

    expect(remainingIds).not.toContain(expiredFile._id.toString());
    expect(remainingIds).toContain(recentFile._id.toString());

    // 5. Check notification
    const notification = await Notification.findOne({ user: user._id, type: "TRASH_CLEANUP" });
    expect(notification).toBeDefined();
    expect(notification.message).toContain("5.24 MB");

    // 6. Check email call
    expect(EmailService.sendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: "trash-summary",
        data: expect.objectContaining({
          freedAmount: "5.24 MB",
          itemCount: 1,
        }),
      })
    );
  });

  it("should handle expired folders recursively", async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 40);

    // Create folder structure in trash
    const folder = await Folder.create({
      name: "Expired Folder",
      user: user._id,
      is_deleted: true,
      deleted_directly: true,
      deleted_at: expiredDate,
    });

    await File.create({
      name: "file_in_folder.txt",
      original_name: "file_in_folder.txt",
      size_bytes: 2048,
      user: user._id,
      folder: folder._id,
      is_deleted: true,
      storage_path: "/tmp/f1",
      mime_type: "text/plain",
      encryption_iv: "iv3",
    });

    // Run cleanup
    await TrashService.autoPurgeExpiredItems();

    // Verify
    const foundFolder = await Folder.findById(folder._id);
    expect(foundFolder).toBeNull();

    const notification = await Notification.findOne({ user: user._id, type: "TRASH_CLEANUP" });
    expect(notification.message).toContain("2.05 KB");
  });
});
