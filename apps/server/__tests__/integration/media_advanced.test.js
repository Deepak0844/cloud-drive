import { jest } from "@jest/globals";
import request from "supertest";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import mongoose from "mongoose";
import app from "#app";
import File from "#models/File.js";

// Units under test / supporting utils
import HlsSessionUtils from "#utils/hlsSessionUtils.js";
import MediaUtils from "#utils/mediaUtils.js";
import CryptoUtils from "#utils/cryptoUtils.js";
import { resolvedFfmpegPath, resolvedFfprobePath } from "#utils/mediaCore.js";
import { HlsConfig } from "#constants/generalConstants.js";
import config from "#config/env.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "#test-helpers/auth.helper.js";

jest.mock("../../services/faceService.js", () => ({
  detectFaces: jest.fn().mockResolvedValue({}),
}));

jest.setTimeout(30000);

// ─── HLS test fixtures ──────────────────────────────────────────────────────────

const execFileAsync = promisify(execFile);
const NAS = config.NAS_STORAGE_PATH;
const tempArtifacts = []; // plaintext fixtures + decrypted source copies to unlink after the run

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, timeoutMs = 8000, stepMs = 50) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return true;
    }
    await delay(stepMs);
  }
  return false;
}

/** Produces a real H.264/AAC mp4 of the given duration (plaintext, on a temp path). */
async function makeTestVideo(durationSec) {
  const out = path.join(os.tmpdir(), `hls-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  await execFileAsync(
    resolvedFfmpegPath,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=320x240:rate=30:duration=${durationSec}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:duration=${durationSec}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      out,
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  );
  tempArtifacts.push(out);
  return out;
}

/** ffprobe duration (seconds) of a plaintext media file. */
async function probeDuration(filePath) {
  const { stdout } = await execFileAsync(resolvedFfprobePath, [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    filePath,
  ]);
  return parseFloat(JSON.parse(stdout).format.duration);
}

/**
 * Returns an async getSource callback that hands ensureSegment a throwaway COPY of the
 * fixture each call (ensureSegment unlinks the returned path when the session ends).
 */
function makeSource(fixturePath) {
  return async () => {
    const copy = path.join(os.tmpdir(), `hls-src-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
    await fsPromises.copyFile(fixturePath, copy);
    tempArtifacts.push(copy);
    return copy;
  };
}

const segPath = (fileId, idx) => path.join(NAS, "hls-cache", fileId, `seg-${idx}.ts`);

async function segExists(fileId, idx) {
  try {
    await fsPromises.access(segPath(fileId, idx));
    return true;
  } catch {
    return false;
  }
}

/** Creates a user with a real wrapped DEK and an AES-256-CTR encrypted media file on disk. */
async function createEncryptedFixture(email, plaintextPath, { mimeType = "video/x-matroska", category = "video", name = "movie.mkv" } = {}) {
  const { plaintextKey, wrappedKey } = CryptoUtils.generateAndWrapUserKey();
  const user = await createTestUser({ email, encryption_key_wrapped: wrappedKey });

  const fileId = new mongoose.Types.ObjectId();
  const storageDir = path.join(NAS, "test-fixtures");
  await fsPromises.mkdir(storageDir, { recursive: true });
  const storagePath = path.join(storageDir, `${fileId}.enc`);

  const iv = CryptoUtils.generateFileIv();
  await new Promise((resolve, reject) => {
    const cipher = CryptoUtils.getCipherStream(plaintextKey, iv);
    const rs = fs.createReadStream(plaintextPath);
    const ws = fs.createWriteStream(storagePath);
    rs.on("error", reject);
    cipher.on("error", reject);
    ws.on("error", reject);
    ws.on("finish", resolve);
    rs.pipe(cipher).pipe(ws);
  });

  const stat = await fsPromises.stat(storagePath);
  const file = await File.create({
    _id: fileId,
    name,
    original_name: name,
    user: user._id,
    mime_type: mimeType,
    category,
    size_bytes: stat.size,
    storage_path: storagePath,
    encryption_iv: iv.toString("hex"),
  });

  return { user, file, auth: getAuthHeader(user) };
}

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
    const { wrappedKey } = CryptoUtils.generateAndWrapUserKey();
    user = await createTestUser({ encryption_key_wrapped: wrappedKey });
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
        encryption_iv: "0123456789abcdef0123456789abcdef",
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
        encryption_iv: "0123456789abcdef0123456789abcdef",
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
        encryption_iv: "0123456789abcdef0123456789abcdef",
      });

      const res = await request(app).get(`/api/v1/files/${file._id}/stream`).set(authHeader).expect(400);

      expect(res.body.message).toContain("Streaming not supported for this file type");
    });
  });

  describe("HLS Streaming (session-based transcoding)", () => {
    afterAll(async () => {
      // Plan M1: stop the idle reaper so jest reports no open handle
      HlsSessionUtils.stopReaper();
      // Remove encrypted fixtures + any leftover HLS cache produced by these tests
      await fsPromises.rm(path.join(NAS, "test-fixtures"), { recursive: true, force: true }).catch(() => {});
      await fsPromises.rm(path.join(NAS, "hls-cache"), { recursive: true, force: true }).catch(() => {});
      for (const artifact of tempArtifacts) {
        await fsPromises.unlink(artifact).catch(() => {});
      }
    });

    // Criterion 5 (+ arg correctness): pure builder, no ffmpeg
    it("builds anchored ffmpeg args with atomic writes and grid alignment", () => {
      const args = MediaUtils.buildHlsSessionArgs({
        sourcePath: "/tmp/in.mp4",
        cacheDir: "/tmp/cache",
        anchorSegment: 3,
        segmentDuration: 6,
        isAudioOnly: false,
      });
      const joined = args.join(" ");

      // Atomic segment writes (never serve a partial)
      expect(joined).toContain("independent_segments+temp_file");
      // Anchored seek + global-timeline offset + start number, all at 3*6 = 18s
      expect(args).toEqual(expect.arrayContaining(["-ss", "18", "-output_ts_offset", "18", "-start_number", "3"]));
      // IDR forced every segmentDuration so each segment is independently decodable
      expect(joined).toContain("expr:gte(t,n_forced*6)");
      // Video path encodes video
      expect(joined).toContain("libx264");

      const audioArgs = MediaUtils.buildHlsSessionArgs({
        sourcePath: "/tmp/in.mp4",
        cacheDir: "/tmp/cache",
        anchorSegment: 0,
        segmentDuration: 6,
        isAudioOnly: true,
      });
      expect(audioArgs.join(" ")).not.toContain("libx264");
    });

    // Criterion 1: master playlist served without transcoding any segment
    it("serves a complete VOD playlist without transcoding a segment", async () => {
      const fixture = await makeTestVideo(20);
      const expectedSegments = Math.ceil((await probeDuration(fixture)) / HlsConfig.SEGMENT_DURATION);
      const { file, auth } = await createEncryptedFixture("hls-playlist@example.com", fixture);

      const res = await request(app).get(`/api/v1/files/${file._id}/hls/master.m3u8`).set(auth).expect(200);

      expect(res.headers["content-type"]).toContain("mpegurl");
      expect(res.text).toContain("#EXT-X-ENDLIST");
      const extinfCount = (res.text.match(/#EXTINF:/g) || []).length;
      expect(extinfCount).toBe(expectedSegments);

      // No segment file was produced just to serve the playlist
      const cacheDir = path.join(NAS, "hls-cache", file._id.toString());
      const segs = fs.existsSync(cacheDir) ? await fsPromises.readdir(cacheDir) : [];
      expect(segs.filter((f) => /^seg-\d+\.ts$/.test(f))).toHaveLength(0);
    });

    // Criterion 2: a far-seek request anchors the session at the requested segment
    it("anchors the session at a far-seek segment instead of transcoding from 0", async () => {
      const fixture = await makeTestVideo(60);
      const fileId = new mongoose.Types.ObjectId().toString();

      const result = await HlsSessionUtils.ensureSegment(NAS, fileId, 3, makeSource(fixture), false);

      expect(result.ready).toBe(true);
      expect(await segExists(fileId, 3)).toBe(true);
      expect(await segExists(fileId, 0)).toBe(false);
      expect(await segExists(fileId, 2)).toBe(false);

      HlsSessionUtils.killSession(fileId);
      await waitFor(() => HlsSessionUtils.getActiveSessionCount() === 0);
    });

    // Criteria 3 + 4: concurrency cap is enforced; an over-cap request returns the no-slot reason
    it("caps concurrent sessions and reports no-slot when the cap is reached", async () => {
      const fixture = await makeTestVideo(60);

      // Occupy both slots: getSource hangs, so the slot is held but no ffmpeg starts yet
      const deferred = () => {
        let resolve;
        const promise = new Promise((r) => {
          resolve = r;
        });
        return { promise, resolve };
      };
      const d1 = deferred();
      const d2 = deferred();
      const call1 = HlsSessionUtils.ensureSegment(NAS, "fileA", 0, () => d1.promise, false);
      const call2 = HlsSessionUtils.ensureSegment(NAS, "fileB", 0, () => d2.promise, false);
      await delay(100); // let both acquire their slots

      // Third distinct file cannot get a slot within a short budget
      const savedWait = HlsConfig.SEGMENT_WAIT_MS;
      HlsConfig.SEGMENT_WAIT_MS = 400;
      const call3 = await HlsSessionUtils.ensureSegment(NAS, "fileC", 0, makeSource(fixture), false);
      HlsConfig.SEGMENT_WAIT_MS = savedWait;

      expect(call3.ready).toBe(false);
      expect(call3.reason).toBe("no-slot");

      // Release the held slots into real sessions, then clean them up
      d1.resolve(await makeSource(fixture)());
      d2.resolve(await makeSource(fixture)());
      await waitFor(() => HlsSessionUtils.getActiveSessionCount() === 2);
      HlsSessionUtils.killSession("fileA");
      HlsSessionUtils.killSession("fileB");
      await Promise.allSettled([call1, call2]);
      await waitFor(() => HlsSessionUtils.getActiveSessionCount() === 0);
    });

    // Criterion 6: killing a session (as the purge path does) tears down the ffmpeg process
    it("kills a running session on demand", async () => {
      const fixture = await makeTestVideo(60);
      const fileId = new mongoose.Types.ObjectId().toString();

      await HlsSessionUtils.ensureSegment(NAS, fileId, 0, makeSource(fixture), false);
      expect(HlsSessionUtils.getActiveSessionCount()).toBe(1);

      HlsSessionUtils.killSession(fileId);

      expect(await waitFor(() => HlsSessionUtils.getActiveSessionCount() === 0)).toBe(true);
    });

    // Regression (DevTools trace): hls.js prefetches seg-0 + seg-1 together; concurrent requests
    // for the same file must reuse one session, not spawn duplicates writing overlapping segments.
    it("does not spawn duplicate sessions for concurrent requests on the same file", async () => {
      const fixture = await makeTestVideo(60);
      const fileId = new mongoose.Types.ObjectId().toString();
      const source = makeSource(fixture);

      const [r0, r1] = await Promise.all([
        HlsSessionUtils.ensureSegment(NAS, fileId, 0, source, false),
        HlsSessionUtils.ensureSegment(NAS, fileId, 1, source, false),
      ]);

      expect(r0.ready).toBe(true);
      expect(r1.ready).toBe(true);
      // Exactly one session served both segments
      expect(HlsSessionUtils.getActiveSessionCount()).toBe(1);

      HlsSessionUtils.killSession(fileId);
      await waitFor(() => HlsSessionUtils.getActiveSessionCount() === 0);
    });

    // Regression (DevTools trace): the last segment is only renamed (temp_file) when ffmpeg
    // exits, so the waiter is woken by the session ENDING, not the poll. It must re-check the
    // cache and report ready — not a spurious "session-died" 503. A 4s fixture is one segment.
    it("returns ready for a segment finalized exactly as the session completes", async () => {
      const fixture = await makeTestVideo(4);
      const fileId = new mongoose.Types.ObjectId().toString();

      const result = await HlsSessionUtils.ensureSegment(NAS, fileId, 0, makeSource(fixture), false);

      expect(result.ready).toBe(true);
      expect(await segExists(fileId, 0)).toBe(true);

      HlsSessionUtils.killSession(fileId);
      await waitFor(() => HlsSessionUtils.getActiveSessionCount() === 0);
    });
  });
});
