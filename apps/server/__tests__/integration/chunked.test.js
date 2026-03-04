import fs from "fs";
import path from "path";
import request from "supertest";

// App
import app from "../../app.js";

// Models
import File from "../../models/File.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "../helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "../helpers/auth.helper.js";

// Services
import FileService from "../../services/file.service.js";

describe("Chunked Upload API", () => {
  let user;
  let authHeader;
  let userDir;

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
    userDir = FileService.getUserDir(user._id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean both assembled files and chunk dirs to prevent cross-test leakage
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
  });

  /* ─── Init ──────────────────────────────────────────────────────────── */

  describe("POST /api/v1/files/upload/init", () => {
    it("should return uploadId and totalChunks", async () => {
      const res = await request(app)
        .post("/api/v1/files/upload/init")
        .set(authHeader)
        .send({ fileName: "big.bin", fileSize: 30 * 1000 * 1000, totalChunks: 2 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.uploadId).toBe("string");
      expect(res.body.data.totalChunks).toBe(2);
    });

    it("should create the chunk directory on disk", async () => {
      const res = await request(app)
        .post("/api/v1/files/upload/init")
        .set(authHeader)
        .send({ fileName: "big.bin", fileSize: 10 * 1000 * 1000, totalChunks: 1 })
        .expect(200);

      const { uploadId } = res.body.data;
      const chunkDir = path.join(userDir, ".chunks", uploadId);
      expect(fs.existsSync(chunkDir)).toBe(true);
    });

    it("should reject if user has exceeded quota", async () => {
      user.used_bytes = user.quota_bytes;
      await user.save();

      const res = await request(app)
        .post("/api/v1/files/upload/init")
        .set(authHeader)
        .send({ fileName: "big.bin", fileSize: 1000, totalChunks: 1 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  /* ─── Upload Chunk (raw binary via query params) ─────────────────────── */

  describe("POST /api/v1/files/upload/chunk", () => {
    let uploadId;

    beforeEach(async () => {
      const initRes = await request(app)
        .post("/api/v1/files/upload/init")
        .set(authHeader)
        .send({ fileName: "big.bin", fileSize: 2 * 1000 * 1000, totalChunks: 2 });

      uploadId = initRes.body.data.uploadId;
    });

    it("should accept a raw binary chunk via query params and write it to disk", async () => {
      const chunkData = Buffer.alloc(1000, 0xab);

      const res = await request(app)
        .post(`/api/v1/files/upload/chunk?uploadId=${uploadId}&chunkIndex=0`)
        .set(authHeader)
        .set("Content-Type", "application/octet-stream")
        .send(chunkData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.chunkIndex)).toBe(0);

      const chunkPath = path.join(userDir, ".chunks", uploadId, "chunk_0");
      expect(fs.existsSync(chunkPath)).toBe(true);
      expect(fs.statSync(chunkPath).size).toBe(chunkData.length);
    });

    it("should fail without a body", async () => {
      const res = await request(app)
        .post(`/api/v1/files/upload/chunk?uploadId=${uploadId}&chunkIndex=0`)
        .set(authHeader)
        .set("Content-Type", "application/octet-stream")
        .send(Buffer.alloc(0))
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should fail with an invalid uploadId (no chunk dir)", async () => {
      const chunkData = Buffer.alloc(512, 0x00);

      const res = await request(app)
        .post("/api/v1/files/upload/chunk?uploadId=nonexistent_id&chunkIndex=0")
        .set(authHeader)
        .set("Content-Type", "application/octet-stream")
        .send(chunkData)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  /* ─── Full flow: init → chunks → finalize ────────────────────────────── */

  describe("Full chunked upload flow", () => {
    it("should assemble a 2-chunk upload into a final file with correct byte content", async () => {
      const chunkA = Buffer.alloc(512, 0xaa);
      const chunkB = Buffer.alloc(512, 0xbb);
      const expectedSize = chunkA.length + chunkB.length;

      // 1. Init
      const initRes = await request(app)
        .post("/api/v1/files/upload/init")
        .set(authHeader)
        .send({ fileName: "assembled.bin", fileSize: expectedSize, totalChunks: 2 })
        .expect(200);

      const { uploadId } = initRes.body.data;

      // 2. Upload chunk 0 (raw binary)
      await request(app)
        .post(`/api/v1/files/upload/chunk?uploadId=${uploadId}&chunkIndex=0`)
        .set(authHeader)
        .set("Content-Type", "application/octet-stream")
        .send(chunkA)
        .expect(200);

      // 3. Upload chunk 1 (raw binary)
      await request(app)
        .post(`/api/v1/files/upload/chunk?uploadId=${uploadId}&chunkIndex=1`)
        .set(authHeader)
        .set("Content-Type", "application/octet-stream")
        .send(chunkB)
        .expect(200);

      // 4. Finalize
      const finalRes = await request(app)
        .post("/api/v1/files/upload/finalize")
        .set(authHeader)
        .send({
          uploadId,
          fileName: "assembled.bin",
          mimeType: "application/octet-stream",
        })
        .expect(201);

      expect(finalRes.body.success).toBe(true);
      expect(finalRes.body.data.size_bytes).toBe(expectedSize);
      expect(finalRes.body.data.original_name).toBe("assembled.bin");

      // Verify byte content and cleanup
      const dbFile = await File.findById(finalRes.body.data._id);
      expect(dbFile).not.toBeNull();
      expect(fs.existsSync(dbFile.storage_path)).toBe(true);
      const assembled = fs.readFileSync(dbFile.storage_path);
      expect(assembled.subarray(0, 512).every((b) => b === 0xaa)).toBe(true);
      expect(assembled.subarray(512).every((b) => b === 0xbb)).toBe(true);

      // Verify chunk dir cleaned up
      const chunkDir = path.join(userDir, ".chunks", uploadId);
      expect(fs.existsSync(chunkDir)).toBe(false);
    });

    it("should fail finalize when uploadId does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/files/upload/finalize")
        .set(authHeader)
        .send({ uploadId: "ghost_upload_id", fileName: "ghost.bin", mimeType: "application/octet-stream" })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});
