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

describe("Folder API", () => {
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

  describe("POST /api/v1/folders", () => {
    it("should create a root folder successfully", async () => {
      const response = await request(app)
        .post("/api/v1/folders")
        .set(authHeader)
        .send({ name: "New Folder" })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("New Folder");
      expect(response.body.data.user).toBe(user._id.toString());
      expect(response.body.data.parent).toBeNull();
    });

    it("should create a subfolder", async () => {
      const parent = await Folder.create({ name: "Parent", user: user._id });

      const response = await request(app)
        .post("/api/v1/folders")
        .set(authHeader)
        .send({ name: "Subfolder", parent: parent._id.toString() })
        .expect(201);

      expect(response.body.data.parent).toBe(parent._id.toString());
    });
  });

  describe("GET /api/v1/folders", () => {
    beforeEach(async () => {
      await Folder.create([
        { name: "Folder 1", user: user._id },
        { name: "Folder 2", user: user._id },
      ]);
    });

    it("should list root folders", async () => {
      const response = await request(app).get("/api/v1/folders").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(2);
    });
  });

  describe("GET /api/v1/folders/:id", () => {
    it("should get folder details and content", async () => {
      const folder = await Folder.create({ name: "Details", user: user._id });
      await File.create({
        name: "f1.txt",
        original_name: "f1.txt",
        size_bytes: 10,
        user: user._id,
        folder: folder._id,
        storage_path: "/tmp/f1",
        mime_type: "text/plain",
      });

      const response = await request(app).get(`/api/v1/folders/${folder._id}`).set(authHeader).expect(200);

      expect(response.body.data.name).toBe("Details");
    });
  });

  describe("PATCH /api/v1/folders/:id", () => {
    it("should rename a folder", async () => {
      const folder = await Folder.create({ name: "Old Name", user: user._id });

      const response = await request(app)
        .patch(`/api/v1/folders/${folder._id}`)
        .set(authHeader)
        .send({ name: "New Name" })
        .expect(200);

      expect(response.body.data.name).toBe("New Name");
    });
  });

  describe("DELETE /api/v1/folders/:id", () => {
    it("should soft delete a folder", async () => {
      const folder = await Folder.create({ name: "To Delete", user: user._id });

      await request(app).delete(`/api/v1/folders/${folder._id}`).set(authHeader).expect(200);

      const deleted = await Folder.findById(folder._id);
      expect(deleted.is_deleted).toBe(true);
    });
  });

  describe("Ownership Security", () => {
    let otherUser;
    let otherHeader;

    beforeEach(async () => {
      otherUser = await createTestUser({ email: "other@example.com" });
      otherHeader = getAuthHeader(otherUser);
    });

    it("should prevent User B from accessing User A's folder", async () => {
      const folder = await Folder.create({ name: "Private", user: user._id });

      await request(app).get(`/api/v1/folders/${folder._id}`).set(otherHeader).expect(404);
    });

    it("should prevent User B from deleting User A's folder", async () => {
      const folder = await Folder.create({ name: "Untouchable", user: user._id });

      await request(app).delete(`/api/v1/folders/${folder._id}`).set(otherHeader).expect(404);

      const check = await Folder.findById(folder._id);
      expect(check.is_deleted).toBe(false);
    });
  });

  describe("Recursive Integrity", () => {
    it("should hide child files when parent folder is soft-deleted", async () => {
      const parent = await Folder.create({ name: "Parent", user: user._id });
      await File.create({
        name: "child.txt",
        original_name: "child.txt",
        size_bytes: 10,
        user: user._id,
        folder: parent._id,
        storage_path: "/tmp/c1",
        mime_type: "text/plain",
      });

      // Soft delete parent
      await request(app).delete(`/api/v1/folders/${parent._id}`).set(authHeader).expect(200);

      // Verify folder is deleted
      const deletedFolder = await Folder.findById(parent._id);
      expect(deletedFolder.is_deleted).toBe(true);

      // The child file in the database might still have is_deleted: false,
      // but it should NOT be returned by the standard list files API for that folder
      // or should be marked as is_deleted if cascading is implemented.
      // Standard list files for that folderId should now ideally return 0 or fail.
      const response = await request(app).get(`/api/v1/files?folderId=${parent._id}`).set(authHeader).expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });
});
