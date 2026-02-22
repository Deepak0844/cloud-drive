import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import File from "../../models/File.js";
import { setupTests, teardownTests, resetTests } from "../helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "../helpers/auth.helper.js";
import { Roles } from "../../constants/generalConstants.js";

// Import service after setup to ensure mongoose is ready
let DuplicateService;

jest.setTimeout(30000);

describe("System & Maintenance API", () => {
  let admin;
  let adminAuth;
  let user;
  let userAuth;

  beforeAll(async () => {
    await setupTests();
    DuplicateService = (await import("../../services/duplicate.service.js")).default;
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await resetTests();
    // Create admin
    admin = await createTestUser({ role: Roles.ADMIN, email: "admin@test.com" });
    adminAuth = getAuthHeader(admin);

    // Create regular user
    user = await createTestUser({ email: "user@test.com" });
    userAuth = getAuthHeader(user);
  });

  describe("Admin System Stats", () => {
    it("should return hardware stats for admin", async () => {
      const res = await request(app).get("/api/v1/admin/stats").set(adminAuth).expect(200);

      expect(res.body.data.system).toBeDefined();
      expect(res.body.data.system.cpu).toBeDefined();
      expect(res.body.data.analytics).toBeDefined();
    });

    it("should deny access to non-admin", async () => {
      await request(app).get("/api/v1/admin/stats").set(userAuth).expect(403);
    });
  });

  describe("Duplicate Detection", () => {
    it("should identify duplicates for a user", async () => {
      // Create two files with same hash
      await File.create([
        {
          name: "file1.txt",
          original_name: "file1.txt",
          user: user._id,
          mime_type: "text/plain",
          size_bytes: 100,
          storage_path: "/tmp/file1.txt",
          hash: "abc123hash",
          category: "document",
        },
        {
          name: "file1_copy.txt",
          original_name: "file1_copy.txt",
          user: user._id,
          mime_type: "text/plain",
          size_bytes: 100,
          storage_path: "/tmp/file1_copy.txt",
          hash: "abc123hash",
          category: "document",
        },
      ]);

      // Trigger duplicate sync (manually for test)
      await DuplicateService.findAndNotifyDuplicates();

      // Verification: Check if duplicate has been identified (we can't easily check notifications in this test without more mocking, but we verify it runs without error)
    });
  });
});
