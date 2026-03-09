import { jest } from "@jest/globals";
import request from "supertest";
import fs from "fs";
import path from "path";
import app from "#app";
import File from "#models/File.js";
import Folder from "#models/Folder.js";
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "#test-helpers/auth.helper.js";

jest.setTimeout(30000);

describe("Bulk Operations API", () => {
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

  describe("POST /api/v1/files/bulk-download", () => {
    it("should generate a ZIP and stream it", async () => {
      // Create a test file on disk
      const testFilePath = path.join("/tmp", `test-${Date.now()}.txt`);
      fs.writeFileSync(testFilePath, "hello world");

      const file = await File.create({
        name: "test.txt",
        original_name: "test.txt",
        user: user._id,
        mime_type: "text/plain",
        size_bytes: 11,
        storage_path: testFilePath,
        category: "document",
      });

      const res = await request(app)
        .post("/api/v1/files/bulk-download")
        .set(authHeader)
        .send({
          items: [{ id: file._id, type: "file" }],
        })
        .expect(200);

      expect(res.header["content-type"]).toBe("application/zip");
      expect(res.header["content-disposition"]).toContain(".zip");

      fs.unlinkSync(testFilePath);
    });
  });

  describe("POST /api/v1/files/bulk-move", () => {
    it("should move multiple items to a target folder", async () => {
      const folder = await Folder.create({ name: "Target", user: user._id, path: "/" });
      const file1 = await File.create({
        name: "file1.txt",
        original_name: "file1.txt",
        user: user._id,
        mime_type: "text/plain",
        size_bytes: 100,
        storage_path: "/tmp/f1.txt",
        category: "document",
      });
      const file2 = await File.create({
        name: "file2.txt",
        original_name: "file2.txt",
        user: user._id,
        mime_type: "text/plain",
        size_bytes: 100,
        storage_path: "/tmp/f2.txt",
        category: "document",
      });

      await request(app)
        .post("/api/v1/files/bulk-move")
        .set(authHeader)
        .send({
          items: [
            { id: file1._id, type: "file" },
            { id: file2._id, type: "file" },
          ],
          targetFolderId: folder._id,
        })
        .expect(200);

      const movedFile1 = await File.findById(file1._id);
      const movedFile2 = await File.findById(file2._id);

      expect(String(movedFile1.folder)).toBe(String(folder._id));
      expect(String(movedFile2.folder)).toBe(String(folder._id));
    });
  });

  describe("POST /api/v1/files/bulk-copy", () => {
    it("should copy multiple items to a target folder", async () => {
      const folder = await Folder.create({ name: "Destination", user: user._id, path: "/" });

      // Mock copyFileSync
      jest.spyOn(fs, "copyFileSync").mockImplementation(() => {});
      jest.spyOn(fs, "existsSync").mockReturnValue(true);

      const file1 = await File.create({
        name: "file1.txt",
        original_name: "file1.txt",
        user: user._id,
        mime_type: "text/plain",
        size_bytes: 100,
        storage_path: "/tmp/f1.txt",
        category: "document",
      });

      await request(app)
        .post("/api/v1/files/bulk-copy")
        .set(authHeader)
        .send({
          items: [{ id: file1._id, type: "file" }],
          targetFolderId: folder._id,
        })
        .expect(200);

      const files = await File.find({ folder: folder._id, user: user._id });
      expect(files.length).toBe(1);
      expect(files[0].name).toContain("file1.txt");
    });
  });
});
