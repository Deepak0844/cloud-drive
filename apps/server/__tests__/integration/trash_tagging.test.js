import request from "supertest";
import app from "../../app.js";
import File from "../../models/File.js";
import Folder from "../../models/Folder.js";
import { setupTests, teardownTests, resetTests } from "../helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "../helpers/auth.helper.js";

describe("Advanced Trash & Tagging API", () => {
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

  describe("Advanced Trash (original_parent)", () => {
    it("should store original_parent when deleted", async () => {
      const folder = await Folder.create({ name: "Source", user: user._id });
      const file = await File.create({
        name: "test.txt",
        original_name: "test.txt",
        user: user._id,
        folder: folder._id,
        size_bytes: 100,
        storage_path: "/tmp/test.txt",
        mime_type: "text/plain",
      });

      await request(app).delete(`/api/v1/files/${file._id}`).set(authHeader).expect(200);

      const deletedFile = await File.findById(file._id);
      expect(deletedFile.is_deleted).toBe(true);
      expect(deletedFile.original_parent.toString()).toBe(folder._id.toString());
    });

    it("should restore to original_parent if it exists", async () => {
      const folder = await Folder.create({ name: "Source", user: user._id });
      const file = await File.create({
        name: "test.txt",
        original_name: "test.txt",
        user: user._id,
        folder: folder._id,
        size_bytes: 100,
        storage_path: "/tmp/test.txt",
        mime_type: "text/plain",
      });

      // Delete
      await request(app).delete(`/api/v1/files/${file._id}`).set(authHeader).expect(200);

      // Restore
      await request(app).post(`/api/v1/trash/${file._id}/restore`).set(authHeader).expect(200);

      const restoredFile = await File.findById(file._id);
      expect(restoredFile.is_deleted).toBe(false);
      expect(restoredFile.folder.toString()).toBe(folder._id.toString());
    });

    it("should restore to root if original_parent is deleted", async () => {
      const folder = await Folder.create({ name: "Source", user: user._id });
      const file = await File.create({
        name: "test.txt",
        original_name: "test.txt",
        user: user._id,
        folder: folder._id,
        size_bytes: 100,
        storage_path: "/tmp/test.txt",
        mime_type: "text/plain",
      });

      // Delete file
      await request(app).delete(`/api/v1/files/${file._id}`).set(authHeader).expect(200);
      // Delete folder
      await request(app).delete(`/api/v1/folders/${folder._id}`).set(authHeader).expect(200);

      // Restore file
      await request(app).post(`/api/v1/trash/${file._id}/restore`).set(authHeader).expect(200);

      const restoredFile = await File.findById(file._id);
      expect(restoredFile.is_deleted).toBe(false);
      expect(restoredFile.folder).toBeNull();
    });
  });

  describe("Tagging System", () => {
    it("should update and filter files by tags", async () => {
      const file = await File.create({
        name: "work.doc",
        original_name: "work.doc",
        user: user._id,
        size_bytes: 100,
        storage_path: "/tmp/work.doc",
        mime_type: "application/msword",
      });

      // Add tags
      await request(app)
        .patch(`/api/v1/files/${file._id}/tags`)
        .set(authHeader)
        .send({ tags: ["important", "work"] })
        .expect(200);

      // Filter by tag
      const response = await request(app).get("/api/v1/files?tag=important").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].tags).toContain("important");
    });

    it("should update and filter folders by tags", async () => {
      const folder = await Folder.create({ name: "Photos", user: user._id });

      // Add tags
      await request(app)
        .patch(`/api/v1/folders/${folder._id}/tags`)
        .set(authHeader)
        .send({ tags: ["vacation"] })
        .expect(200);

      // Filter by tag
      const response = await request(app).get("/api/v1/folders?tag=vacation").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].tags).toContain("vacation");
    });
  });
});
