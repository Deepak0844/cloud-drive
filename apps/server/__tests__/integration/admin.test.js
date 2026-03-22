import { jest } from "@jest/globals";
import request from "supertest";

// App
import app from "#app";

// Models
import User from "#models/User.js";
import QuotaRequest from "#models/QuotaRequest.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createAdminUser, createTestUser, getAuthHeader } from "#test-helpers/auth.helper.js";

describe("Admin API", () => {
  let admin;
  let adminHeader;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await resetTests();
    admin = await createAdminUser();
    adminHeader = getAuthHeader(admin);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("GET /api/v1/admin/users", () => {
    it("should list all users", async () => {
      await createTestUser({ email: "user2@example.com" });

      const response = await request(app).get("/api/v1/admin/users").set(adminHeader).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1); // user2
    });

    it("should fail for non-admin users", async () => {
      const user = await createTestUser({ email: "nonadmin@example.com" });
      const userHeader = getAuthHeader(user);

      await request(app).get("/api/v1/admin/users").set(userHeader).expect(403);
    });
  });

  describe("PATCH /api/v1/admin/users/:id/quota", () => {
    it("should update user quota", async () => {
      const user = await createTestUser({ email: "user@example.com" });
      const newQuota = 10 * 1000 * 1000 * 1000;

      const response = await request(app)
        .patch(`/api/v1/admin/users/${user._id}/quota`)
        .set(adminHeader)
        .send({ quota_bytes: newQuota })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quota_bytes).toBe(newQuota);

      const updated = await User.findById(user._id);
      expect(updated.quota_bytes).toBe(newQuota);
    });
  });

  describe("PATCH /api/v1/admin/quota-requests/:id", () => {
    it("should approve a quota request", async () => {
      const user = await createTestUser({ email: "requester@example.com" });
      const initialQuota = user.quota_bytes;
      const requestBytes = 5 * 1000 * 1000 * 1000;
      const qr = await QuotaRequest.create({
        user: user._id,
        requested_bytes: requestBytes,
        reason: "Need space",
      });

      const response = await request(app)
        .patch(`/api/v1/admin/quota-requests/${qr._id}`)
        .set(adminHeader)
        .send({ status: "APPROVED", admin_note: "Allowed" })
        .expect(200);

      expect(response.body.data.status).toBe("APPROVED");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.quota_bytes).toBe(initialQuota + requestBytes);
    });
  });

  describe("GET /api/v1/admin/stats", () => {
    it("should get system stats", async () => {
      const response = await request(app).get("/api/v1/admin/stats").set(adminHeader).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.counts.total_users).toBeDefined();
    });
  });

  describe("Security Edge Cases", () => {
    it("should deny access to approve quota request for non-admin", async () => {
      const user = await createTestUser({ email: "user@example.com" });
      const userHeader = getAuthHeader(user);
      const qr = await QuotaRequest.create({
        user: user._id,
        requested_bytes: 1000,
        reason: "Need",
      });

      await request(app)
        .patch(`/api/v1/admin/quota-requests/${qr._id}`)
        .set(userHeader)
        .send({ status: "APPROVED" })
        .expect(403);
    });
  });
});
