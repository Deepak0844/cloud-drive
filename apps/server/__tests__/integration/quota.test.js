import { jest } from "@jest/globals";
import request from "supertest";

// App
import app from "../../app.js";

// Models
import File from "../../models/File.js";
import User from "../../models/User.js";
import QuotaRequest from "../../models/QuotaRequest.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "../helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "../helpers/auth.helper.js";

describe("Quota API", () => {
  let user;
  let authHeader;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await resetTests();
    user = await createTestUser();
    authHeader = getAuthHeader(user);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("GET /api/v1/quota/usage", () => {
    it("should get quota usage", async () => {
      const response = await request(app).get("/api/v1/quota/usage").set(authHeader).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quota_bytes).toBe(user.quota_bytes);
      expect(response.body.data.used_bytes).toBe(0);
    });
  });

  describe("POST /api/v1/quota/request", () => {
    it("should request quota increase", async () => {
      const response = await request(app)
        .post("/api/v1/quota/request")
        .set(authHeader)
        .send({ requested_bytes: 10 * 1024 * 1024 * 1024, reason: "Need more space" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requested_bytes).toBe(10 * 1024 * 1024 * 1024);

      const qr = await QuotaRequest.findOne({ user: user._id });
      expect(qr).toBeDefined();
    });

    it("should fail if already has a pending request", async () => {
      await QuotaRequest.create({
        user: user._id,
        requested_bytes: 10 * 1024 * 1024 * 1024,
        reason: "First",
      });

      const response = await request(app)
        .post("/api/v1/quota/request")
        .set(authHeader)
        .send({ requested_bytes: 20 * 1024 * 1024 * 1024, reason: "Second" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
  describe("Quota Enforcement", () => {
    it("should fail to upload file if quota is exceeded", async () => {
      // Set user quota to a small value (1 KB)
      user.quota_bytes = 1024;
      await user.save();

      // Create a large file (2 KB)
      const largeFile = Buffer.alloc(2048, "a");

      const response = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", largeFile, "large.txt")
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/quota|limit/i);
    });
    it("should still count trashed items toward quota until emptied", async () => {
      // 1. Upload a file (500 bytes)
      await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.alloc(500), "normal.txt")
        .expect(201);

      // 2. Trash it
      const file = await File.findOne({ user: user._id, is_deleted: false });
      await request(app).delete(`/api/v1/files/${file._id}`).set(authHeader).expect(200);

      // 3. Verify used_bytes is still 500
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.used_bytes).toBe(500);

      // 4. Try to upload another file that exceeds quota (User has 1KB quota from beforeEach/save)
      // Set quota to 600 just to be tight
      updatedUser.quota_bytes = 600;
      await updatedUser.save();

      await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.alloc(200), "extra.txt")
        .expect(403);
    });
  });
});
