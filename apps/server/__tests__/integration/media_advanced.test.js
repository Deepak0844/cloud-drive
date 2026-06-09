import { jest } from "@jest/globals";
import request from "supertest";
import app from "#app";
import File from "#models/File.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "#test-helpers/auth.helper.js";

jest.mock("../../services/faceService.js", () => ({
  detectFaces: jest.fn().mockResolvedValue({}),
}));

jest.setTimeout(30000);

describe("Advanced Media API", () => {
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

  describe("Media URLs & Metadata", () => {
    it("should return absolute URLs in file response", async () => {
      // Create a dummy file in DB (mocked storage path for metadata test)
      await File.create({
        name: "test_photo.jpg",
        original_name: "test_photo.jpg",
        user: user._id,
        mime_type: "image/jpeg",
        category: "image",
        size_bytes: 1000,
        storage_path: "/tmp/test.jpg",
        thumbnail_path: "/tmp/thumb.jpg",
        metadata: { width: 1920, height: 1080 },
        gps: { lat: 12.9716, lng: 77.5946 },
        taken_at: new Date(),
        encryption_iv: "iv1",
      });

      const res = await request(app).get("/api/v1/files").set(authHeader).expect(200);

      const fileRes = res.body.data.find((f) => f.name === "test_photo.jpg");
      expect(fileRes.thumbnail_url).toContain("/preview?thumbnail=true");
      expect(fileRes.original_url).toContain("/download");
      expect(fileRes.gps.lat).toBe(12.9716);
    });

    it("should handle audio metadata and streaming", async () => {
      await File.create({
        name: "song.mp3",
        original_name: "song.mp3",
        user: user._id,
        mime_type: "audio/mpeg",
        category: "audio",
        size_bytes: 5000000,
        storage_path: "/tmp/song.mp3",
        audio_metadata: {
          artist: "Test Artist",
          album: "Test Album",
          title: "Test Song",
        },
        encryption_iv: "iv2",
      });

      const res = await request(app).get("/api/v1/files").set(authHeader).expect(200);
      const fileRes = res.body.data.find((f) => f.name === "song.mp3");

      expect(fileRes.audio_metadata.artist).toBe("Test Artist");
      expect(fileRes.stream_url).toContain("/stream");
    });
  });

  describe("Streaming Restrictions", () => {
    it("should return 400 if streaming is not supported for this file type", async () => {
      const file = await File.create({
        name: "video.mp4",
        original_name: "video.mp4",
        user: user._id,
        mime_type: "application/msword",
        category: "document",
        size_bytes: 10000000,
        storage_path: "/tmp/doc.docx",
        encryption_iv: "iv3",
      });

      const res = await request(app).get(`/api/v1/files/${file._id}/stream`).set(authHeader).expect(400);

      expect(res.body.message).toContain("Streaming not supported for this file type");
    });
  });
});
