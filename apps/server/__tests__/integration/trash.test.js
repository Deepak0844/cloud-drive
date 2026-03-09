import { jest } from "@jest/globals";
import request from "supertest";

// App
import app from "#app";

// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "#test-helpers/auth.helper.js";

describe("Trash API", () => {
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

  describe("GET /api/v1/trash", () => {
    it("should list trashed items", async () => {
      await File.create({
        name: "deleted.txt",
        original_name: "deleted.txt",
        size_bytes: 10,
        user: user._id,
        is_deleted: true,
        deleted_directly: true,
        storage_path: "/tmp/d1",
        mime_type: "text/plain",
      });

      const response = await request(app).get("/api/v1/trash").set(authHeader).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files.length).toBe(1);
    });
  });

  describe("POST /api/v1/trash/:id/restore", () => {
    it("should restore a trashed item", async () => {
      const file = await File.create({
        name: "restore.txt",
        original_name: "restore.txt",
        size_bytes: 10,
        user: user._id,
        is_deleted: true,
        deleted_directly: true,
        storage_path: "/tmp/r1",
        mime_type: "text/plain",
      });

      const response = await request(app)
        .post(`/api/v1/trash/restore`)
        .set(authHeader)
        .send({ items: [{ id: file._id, type: "file" }] })
        .expect(200);

      expect(response.body.success).toBe(true);
      const updated = await File.findById(file._id);
      expect(updated.is_deleted).toBe(false);
    });
  });

  describe("DELETE /api/v1/trash/:id", () => {
    it("should permanently delete a trashed item", async () => {
      const file = await File.create({
        name: "perm.txt",
        original_name: "perm.txt",
        size_bytes: 10,
        user: user._id,
        is_deleted: true,
        deleted_directly: true,
        storage_path: "/tmp/p1",
        mime_type: "text/plain",
      });

      await request(app)
        .delete(`/api/v1/trash/permanent`)
        .set(authHeader)
        .send({ items: [{ id: file._id, type: "file" }] })
        .expect(200);

      const deleted = await File.findById(file._id);
      expect(deleted).toBeNull();
    });
  });

  describe("POST /api/v1/trash/empty", () => {
    it("should empty the trash", async () => {
      await File.create({
        name: "trash1.txt",
        original_name: "trash1.txt",
        size_bytes: 10,
        user: user._id,
        is_deleted: true,
        deleted_directly: true,
        storage_path: "/tmp/t1",
        mime_type: "text/plain",
      });

      const response = await request(app).delete("/api/v1/trash/empty").set(authHeader).expect(200);

      expect(response.body.success).toBe(true);
      const trashed = await File.countDocuments({ user: user._id, is_deleted: true });
      expect(trashed).toBe(0);
    });
  });

  describe("Restoration Edge Cases", () => {
    it("should restore file to root if parent folder is still in trash", async () => {
      const folder = await Folder.create({ name: "Parent", user: user._id, is_deleted: true });
      const file = await File.create({
        name: "child.txt",
        original_name: "child.txt",
        size_bytes: 10,
        user: user._id,
        folder: folder._id,
        is_deleted: true,
        storage_path: "/tmp/c1",
        mime_type: "text/plain",
      });

      // Restore file
      await request(app)
        .post(`/api/v1/trash/restore`)
        .set(authHeader)
        .send({ items: [{ id: file._id, type: "file" }] })
        .expect(200);

      const restored = await File.findById(file._id);
      expect(restored.is_deleted).toBe(false);
    });
  });
});
