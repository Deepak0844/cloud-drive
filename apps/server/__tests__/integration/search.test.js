import request from "supertest";
import app from "#app";
import File from "#models/File.js";
import Folder from "#models/Folder.js";
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "#test-helpers/auth.helper.js";

describe("Search & Indexing API", () => {
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

    // Create a variety of files for testing search
    await File.create([
      {
        name: "pic.jpg",
        original_name: "pic.jpg",
        size_bytes: 1000,
        user: user._id,
        storage_path: "/tmp/pic.jpg",
        mime_type: "image/jpeg",
        category: "image",
        extension: "jpg",
        is_favorite: true,
        encryption_iv: "iv1",
      },
      {
        name: "test.pdf",
        original_name: "test.pdf",
        size_bytes: 5120,
        user: user._id,
        storage_path: "/tmp/test.pdf",
        mime_type: "application/pdf",
        category: "document",
        extension: "pdf",
        encryption_iv: "iv2",
      },
      {
        name: "movie.mp4",
        original_name: "movie.mp4",
        size_bytes: 1048576,
        user: user._id,
        storage_path: "/tmp/movie.mp4",
        mime_type: "video/mp4",
        category: "video",
        extension: "mp4",
        encryption_iv: "iv3",
      },
      {
        name: "notes.txt",
        original_name: "notes.txt",
        size_bytes: 100,
        user: user._id,
        storage_path: "/tmp/notes.txt",
        mime_type: "text/plain",
        category: "document",
        extension: "txt",
        encryption_iv: "iv4",
      },
    ]);

    // Create a variety of folders for testing search
    await Folder.create([
      {
        name: "Projects",
        user: user._id,
      },
      {
        name: "Vacation Photos",
        user: user._id,
      },
      {
        name: "Documents",
        user: user._id,
      },
    ]);
  });

  describe("Folder Search", () => {
    it("should search folders by name", async () => {
      const response = await request(app).get("/api/v1/folders?search=project").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("Projects");
    });

    it("should return all folders if no search is provided", async () => {
      const response = await request(app).get("/api/v1/folders").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(3);
    });
  });

  describe("Advanced Filtering", () => {
    it("should filter by category", async () => {
      const response = await request(app).get("/api/v1/files?category=document").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every((f) => f.category === "document")).toBe(true);
    });

    it("should filter by extension", async () => {
      const response = await request(app).get("/api/v1/files?extension=jpg").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("pic.jpg");
    });

    it("should filter by favorite status", async () => {
      const response = await request(app).get("/api/v1/files?isFavorite=true").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].is_favorite).toBe(true);
    });

    it("should filter by size range", async () => {
      const response = await request(app).get("/api/v1/files?minSize=2000&maxSize=10000").set(authHeader).expect(200);

      // Should only find test.pdf (5120 bytes)
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("test.pdf");
    });
  });

  describe("Favorites API", () => {
    it("should toggle favorite status", async () => {
      const file = await File.findOne({ name: "notes.txt" });

      // Toggle ON
      const res1 = await request(app).patch(`/api/v1/files/${file._id}/favorite`).set(authHeader).expect(200);

      expect(res1.body.data.is_favorite).toBe(true);

      // Toggle OFF
      const res2 = await request(app).patch(`/api/v1/files/${file._id}/favorite`).set(authHeader).expect(200);

      expect(res2.body.data.is_favorite).toBe(false);
    });
  });

  describe("Recent Files API", () => {
    it("should return the latest files", async () => {
      const response = await request(app).get("/api/v1/files/recent?limit=2").set(authHeader).expect(200);

      expect(response.body.data.length).toBe(2);
      // Mongoose sort -createdAt means last created is first
      expect(response.body.data[0].createdAt >= response.body.data[1].createdAt).toBe(true);
    });
  });
});
