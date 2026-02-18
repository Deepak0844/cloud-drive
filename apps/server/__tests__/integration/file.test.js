import fs from "fs";
import { jest } from "@jest/globals";
import request from "supertest";

// App
import app from "../../app.js";

// Models
import File from "../../models/File.js";
import Folder from "../../models/Folder.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "../helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "../helpers/auth.helper.js";

describe("File API", () => {
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

    // Ensure storage path exists for tests
    const storagePath = process.env.NAS_STORAGE_PATH || "./test-storage";
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/v1/files/upload", () => {
    it("should upload a file successfully", async () => {
      const response = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.from("test content"), "test.txt")
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.original_name).toBe("test.txt");
      expect(response.body.data.size_bytes).toBe(12); // "test content" length
    });

    it("should upload to a specific folder", async () => {
      const folder = await Folder.create({ name: "Test Folder", user: user._id });

      const response = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .field("folderId", folder._id.toString())
        .attach("file", Buffer.from("test folder content"), "test2.txt")
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toBe(folder._id.toString());
    });

    it("should fail without file", async () => {
      const response = await request(app).post("/api/v1/files/upload").set(authHeader).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/files", () => {
    beforeEach(async () => {
      await File.create([
        {
          name: "file1.txt",
          original_name: "file1.txt",
          size_bytes: 100,
          user: user._id,
          storage_path: "/tmp/1",
          mime_type: "text/plain",
          extension: "txt",
          category: "document",
        },
        {
          name: "file2.jpg",
          original_name: "file2.jpg",
          size_bytes: 200,
          user: user._id,
          storage_path: "/tmp/2",
          mime_type: "image/jpeg",
          extension: "jpg",
          category: "image",
        },
        {
          name: "other.txt",
          original_name: "other.txt",
          size_bytes: 300,
          user: user._id,
          storage_path: "/tmp/3",
          mime_type: "text/plain",
          extension: "txt",
          category: "document",
        },
      ]);
    });

    it("should list all files for the user", async () => {
      const response = await request(app).get("/api/v1/files").set(authHeader).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
    });

    it("should search files by name", async () => {
      const response = await request(app).get("/api/v1/files?search=file").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].name).toContain("file");
    });

    it("should filter by folder", async () => {
      const folder = await Folder.create({ name: "Sub", user: user._id });
      await File.create({
        name: "subfile.txt",
        original_name: "subfile.txt",
        size_bytes: 50,
        user: user._id,
        folder: folder._id,
        storage_path: "/tmp/4",
        mime_type: "text/plain",
        extension: "txt",
        category: "document",
      });

      const response = await request(app).get(`/api/v1/files?folderId=${folder._id}`).set(authHeader).expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("subfile.txt");
    });
  });

  describe("POST /api/v1/files/bulk-delete", () => {
    let files;
    beforeEach(async () => {
      files = await File.create([
        {
          name: "f1",
          original_name: "f1",
          size_bytes: 1,
          user: user._id,
          storage_path: "/tmp/f1",
          mime_type: "text/plain",
        },
        {
          name: "f2",
          original_name: "f2",
          size_bytes: 1,
          user: user._id,
          storage_path: "/tmp/f2",
          mime_type: "text/plain",
        },
      ]);
    });

    it("should delete multiple files", async () => {
      const items = files.map((f) => ({ id: f._id.toString(), type: "file" }));
      const response = await request(app).post("/api/v1/files/bulk-delete").set(authHeader).send({ items }).expect(200);

      expect(response.body.success).toBe(true);
      const remaining = await File.countDocuments({ _id: { $in: files.map((f) => f._id) }, is_deleted: false });
      expect(remaining).toBe(0);
    });
  });

  describe("PUT /api/v1/files/:id/rename", () => {
    it("should rename a file", async () => {
      const file = await File.create({
        name: "old.txt",
        original_name: "old.txt",
        size_bytes: 1,
        user: user._id,
        storage_path: "/tmp/old",
        mime_type: "text/plain",
      });

      const response = await request(app)
        .patch(`/api/v1/files/${file._id}`)
        .set(authHeader)
        .send({ name: "new.txt" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("new.txt");

      const updated = await File.findById(file._id);
      expect(updated.name).toBe("new.txt");
    });
  });

  describe("Ownership Security", () => {
    let otherUser;
    let otherHeader;

    beforeEach(async () => {
      otherUser = await createTestUser({ email: "other@example.com" });
      otherHeader = getAuthHeader(otherUser);
    });

    it("should prevent User B from accessing User A's file", async () => {
      const file = await File.create({
        name: "private.txt",
        original_name: "private.txt",
        size_bytes: 10,
        user: user._id, // Owned by first user
        storage_path: "/tmp/p1",
        mime_type: "text/plain",
        extension: "txt",
        category: "document",
      });

      await request(app)
        .get(`/api/v1/files/${file._id}`)
        .set(otherHeader) // Accessed by other user
        .expect(404); // Should return 404 (not found in their context)
    });

    it("should prevent User B from renaming User A's file", async () => {
      const file = await File.create({
        name: "old.txt",
        original_name: "old.txt",
        size_bytes: 1,
        user: user._id,
        storage_path: "/tmp/old",
        mime_type: "text/plain",
      });

      await request(app).patch(`/api/v1/files/${file._id}`).set(otherHeader).send({ name: "hacked.txt" }).expect(404);

      const updated = await File.findById(file._id);
      expect(updated.name).toBe("old.txt");
    });
  });

  describe("Edge Cases", () => {
    it("should allow uploading a zero-byte file", async () => {
      const response = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.alloc(0), "empty.txt")
        .expect(201);

      expect(response.body.data.size_bytes).toBe(0);
    });

    it("should handle duplicate filenames (auto-rename should happen if implemented)", async () => {
      // First upload
      await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.from("v1"), "same.txt")
        .expect(201);

      // Second upload with same name
      const response = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.from("v2"), "same.txt")
        .expect(201);

      // Check if it got a unique name (e.g. same (1).txt)
      expect(response.body.data.name).not.toBe("same.txt");
    });

    it("should handle filenames with special characters and spaces", async () => {
      const resp = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.from("content"), "My File (2024) 🚀.txt")
        .expect(201);

      expect(resp.body.data.original_name).toContain("My File (2024)");
    });

    it("should prevent access for deactivated users", async () => {
      user.is_active = false;
      await user.save();

      await request(app).get("/api/v1/files").set(authHeader).expect(403);

      await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.from("hi"), "lost.txt")
        .expect(403);
    });

    it("should prevent path traversal attempts in filenames", async () => {
      // Note: Multer/Service should sanitize this
      const response = await request(app)
        .post("/api/v1/files/upload")
        .set(authHeader)
        .attach("file", Buffer.from("malicious"), "../../../etc/passwd")
        .expect(201);

      // Should be sanitized (e.g. etc-passwd or similar)
      expect(response.body.data.name).not.toContain("..");
    });
  });
});
