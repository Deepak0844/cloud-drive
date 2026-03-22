// Native modules
import { execFile, spawn } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import os from "os";

// Third-party modules
import archiver from "archiver";
import { path as installerFfmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as installerFfprobePath } from "@ffprobe-installer/ffprobe";
import heicConvert from "heic-convert";
import sharp from "sharp";

// Utils
import logger from "#utils/logger.js";
import CryptoUtils from "#utils/cryptoUtils.js";

// Prefer system ffmpeg/ffprobe over npm-bundled binaries (better codec support, e.g. Vorbis in MKV)
const systemFfmpeg = fs.existsSync("/usr/bin/ffmpeg") ? "/usr/bin/ffmpeg" : null;
const systemFfprobe = fs.existsSync("/usr/bin/ffprobe") ? "/usr/bin/ffprobe" : null;
const resolvedFfmpegPath = systemFfmpeg || installerFfmpegPath;
const resolvedFfprobePath = systemFfprobe || installerFfprobePath;

logger.info(`[Media] Using ffmpeg: ${resolvedFfmpegPath}`);
logger.info(`[Media] Using ffprobe: ${resolvedFfprobePath}`);

// ─── Format Registries ────────────────────────────────────────────────────────

/**
 * Image formats natively supported by sharp (no pre-processing needed)
 */
const SHARP_NATIVE_FORMATS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".tiff",
  ".tif",
  ".bmp",
  ".svg",
]);

/**
 * RAW camera formats — need ffmpeg to extract a JPEG first
 */
const RAW_IMAGE_FORMATS = new Set([
  ".cr2",
  ".cr3",
  ".nef",
  ".nrw",
  ".arw",
  ".srf",
  ".sr2",
  ".dng",
  ".orf",
  ".rw2",
  ".pef",
  ".raf",
  ".x3f",
  ".3fr",
]);

/**
 * HEIC/HEIF formats — need heic-convert pre-processing
 */
const HEIC_FORMATS = new Set([".heic", ".heif"]);

/**
 * Video formats that browsers can play natively (no MP4 preview needed)
 */
const BROWSER_NATIVE_VIDEO_FORMATS = new Set([".mp4", ".m4v", ".webm"]);

/**
 * Audio MIME types that all modern browsers can play natively (no HLS transcode needed)
 */
const BROWSER_NATIVE_AUDIO_MIMES = new Set([
  "audio/mpeg", // MP3
  "audio/ogg", // OGG Vorbis / Opus-in-OGG
  "audio/wav", // WAV / PCM
  "audio/aac", // AAC
  "audio/mp4", // AAC/ALAC in MP4 container
  "audio/x-m4a", // M4A
  "audio/opus", // Opus
  "audio/webm", // WebM audio
  "audio/flac", // FLAC (Chromium 56+, Firefox 51+)
]);

/**
 * Audio formats supported by music-metadata for album art extraction
 */
const AUDIO_FORMATS_WITH_ART = new Set([
  ".mp3",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wav",
  ".aiff",
  ".aif",
  ".wma",
  ".ape",
  ".wv",
]);

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Creates a directory if it does not exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Helper to decrypt a file to a temporary location for external processing (e.g. ffmpeg/sharp).
 * Remember to fs.promises.unlink() the returned path when done.
 */
async function decryptToTemp(sourcePath, userKey, iv) {
  // Preserve the original file extension so ffprobe/ffmpeg can use it as a
  // format hint.  Raw container formats (e.g. Annex-B HEVC bitstream, .hevc)
  // have a very low auto-detection score — keeping the extension makes
  // probing and thumbnail extraction reliable.
  const origExt = path.extname(path.basename(sourcePath)); // e.g. ".hevc", ".mp4"
  const tempPath = path.join(os.tmpdir(), `cloud-drive-decrypt-${Date.now()}${origExt || ".tmp"}`);
  const decipher = CryptoUtils.getDecipherStream(userKey, iv);

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(sourcePath);
    const writeStream = fs.createWriteStream(tempPath);

    readStream
      .pipe(decipher)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("error", (err) => {
        logger.error(`[Crypto] Decrypt to temp failed: ${err.message}`);
        reject(err);
      });

    readStream.on("error", reject);
    decipher.on("error", reject);
  });

  return tempPath;
}

/**
 * Promise wrapper for ffprobe metadata.
 * Uses execFile directly — no fluent-ffmpeg abstraction layer that can swallow
 * error details or reorder flags.
 */
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      resolvedFfprobePath,
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`ffprobe failed for ${filePath}: ${err.message}\n${stderr}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseErr) {
          reject(new Error(`ffprobe JSON parse failed for ${filePath}: ${parseErr.message}`));
        }
      }
    );
  });
}

/**
 * Check if a video file has a video stream
 */
async function hasVideoStream(filePath) {
  try {
    const data = await probeVideo(filePath);
    return data.streams.some((s) => s.codec_type === "video");
  } catch {
    return false;
  }
}

/**
 * Get video duration in seconds using ffprobe
 */
async function getVideoDuration(filePath) {
  try {
    const data = await probeVideo(filePath);
    return parseFloat(data.format.duration) || 0;
  } catch {
    return 0;
  }
}

// ─── Media Probe (Encrypted) ─────────────────────────────────────────────────

/**
 * Probes an encrypted media file and returns its metadata.
 * Decrypts to a temp file first so ffprobe can seek freely.
 *
 * @param {string} storagePath  - Encrypted file path on disk
 * @param {Buffer} userKey      - Unwrapped DEK
 * @param {Buffer} iv           - File IV
 * @returns {Promise<{ duration: number, hasVideo: boolean, hasAudio: boolean, width: number, height: number }>}
 */
async function probeEncryptedMedia(storagePath, userKey, iv) {
  let tempPath = null;
  try {
    tempPath = await decryptToTemp(storagePath, userKey, iv);
    const data = await probeVideo(tempPath);

    const hasVideo = data.streams.some((s) => s.codec_type === "video");
    const hasAudio = data.streams.some((s) => s.codec_type === "audio");
    const duration = parseFloat(data.format.duration) || 0;
    const videoStream = data.streams.find((s) => s.codec_type === "video");

    return {
      duration,
      hasVideo,
      hasAudio,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
    };
  } finally {
    if (tempPath) {
      await fsPromises.unlink(tempPath).catch(() => {});
    }
  }
}

// ─── Image Thumbnails ─────────────────────────────────────────────────────────

/**
 * Extract a JPEG from a RAW camera file using ffmpeg.
 * Uses execFile directly for reliable error reporting.
 */
function extractRawImageFrame(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    execFile(
      resolvedFfmpegPath,
      ["-y", "-i", sourcePath, "-vframes", "1", "-q:v", "2", "-f", "mjpeg", destPath],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(`RAW extraction failed: ${err.message}\n${stderr}`));
        } else {
          resolve(destPath);
        }
      }
    );
  });
}

/**
 * Generates a thumbnail for any image format
 * Supports: JPEG, PNG, GIF, WebP, AVIF, TIFF, BMP, SVG, HEIC/HEIF, RAW (CR2, NEF, ARW, DNG, etc.)
 *
 * @param {string} sourcePath - Path to the encrypted source image
 * @param {string} destPath - Path to save the thumbnail
 * @param {Buffer} userKey - Unwrapped DEK
 * @param {Buffer} iv - File IV
 * @returns {Promise<string>} - Path to the generated thumbnail
 */
async function generateImageThumbnail(sourcePath, destPath, userKey, iv) {
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);

  const ext = path.extname(sourcePath).toLowerCase();

  let unencryptedSource = null;

  try {
    // Decrypt the physical file to a temp location first
    unencryptedSource = await decryptToTemp(sourcePath, userKey, iv);
    // ── HEIC/HEIF: convert to JPEG buffer first ──
    if (HEIC_FORMATS.has(ext)) {
      logger.debug(`[Thumbnail] HEIC/HEIF detected: ${sourcePath}`);
      const inputBuffer = await fsPromises.readFile(unencryptedSource);
      const jpegBuffer = await heicConvert({ buffer: inputBuffer, format: "JPEG", quality: 0.85 });
      await sharp(jpegBuffer)
        .resize(300, 300, { fit: "cover", withoutEnlargement: false })
        .toFormat("jpeg", { quality: 85 })
        .toFile(destPath);
      logger.info(`[Thumbnail] HEIC thumbnail generated: ${destPath}`);
      return destPath;
    }

    // ── RAW camera formats: extract via ffmpeg then thumbnail ──
    if (RAW_IMAGE_FORMATS.has(ext)) {
      logger.debug(`[Thumbnail] RAW format detected (${ext}): ${sourcePath}`);
      const tempJpeg = destPath.replace(".jpg", "_raw_temp.jpg");
      try {
        await extractRawImageFrame(unencryptedSource, tempJpeg);
        await sharp(tempJpeg)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        fs.unlinkSync(tempJpeg);
        logger.info(`[Thumbnail] RAW thumbnail generated: ${destPath}`);
        return destPath;
      } catch (rawErr) {
        logger.warn(`[Thumbnail] RAW extraction failed, skipping: ${rawErr.message}`);
        if (fs.existsSync(tempJpeg)) {
          fs.unlinkSync(tempJpeg);
        }
        throw rawErr;
      }
    }

    // ── SVG: rasterize with explicit density ──
    if (ext === ".svg") {
      logger.debug(`[Thumbnail] SVG detected: ${sourcePath}`);
      await sharp(unencryptedSource, { density: 150 })
        .resize(300, 300, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toFormat("jpeg", { quality: 85 })
        .toFile(destPath);
      logger.info(`[Thumbnail] SVG thumbnail generated: ${destPath}`);
      return destPath;
    }

    // ── AVIF: sharp → sips (macOS) → ffmpeg fallback chain ──
    if (ext === ".avif") {
      logger.debug(`[Thumbnail] AVIF detected: ${sourcePath}`);

      // Attempt 1: sharp (works for 8-bit AVIF)
      try {
        await sharp(unencryptedSource)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        logger.info(`[Thumbnail] AVIF thumbnail generated via sharp: ${destPath}`);
        return destPath;
      } catch (sharpErr) {
        logger.warn(`[Thumbnail] AVIF sharp failed (${sharpErr.message}), trying sips fallback`);
      }

      // Attempt 2: macOS sips (handles 10/12-bit AVIF that sharp can't decode)
      const sipsTempJpeg = destPath.replace(".jpg", "_sips_temp.jpg");
      try {
        await new Promise((resolve, reject) => {
          execFile(
            "sips",
            [
              "-s",
              "format",
              "jpeg",
              "-s",
              "formatOptions",
              "85",
              "-Z",
              "300",
              unencryptedSource,
              "--out",
              sipsTempJpeg,
            ],
            { timeout: 15000 },
            (err) => (err ? reject(err) : resolve())
          );
        });
        // sips doesn't do cover-crop, so re-process through sharp for exact 300×300
        await sharp(sipsTempJpeg)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        fs.unlinkSync(sipsTempJpeg);
        logger.info(`[Thumbnail] AVIF thumbnail generated via sips fallback: ${destPath}`);
        return destPath;
      } catch (sipsErr) {
        if (fs.existsSync(sipsTempJpeg)) {
          fs.unlinkSync(sipsTempJpeg);
        }
        logger.warn(`[Thumbnail] AVIF sips fallback failed (${sipsErr.message}), trying ffmpeg`);
      }

      // Attempt 3: ffmpeg (last resort)
      const ffmpegTempJpeg = destPath.replace(".jpg", "_avif_temp.jpg");
      try {
        await extractRawImageFrame(unencryptedSource, ffmpegTempJpeg);
        await sharp(ffmpegTempJpeg)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        fs.unlinkSync(ffmpegTempJpeg);
        logger.info(`[Thumbnail] AVIF thumbnail generated via ffmpeg fallback: ${destPath}`);
        return destPath;
      } catch (fallbackErr) {
        logger.error(`[Thumbnail] AVIF all fallbacks failed: ${fallbackErr.message}`);
        if (fs.existsSync(ffmpegTempJpeg)) {
          fs.unlinkSync(ffmpegTempJpeg);
        }
        throw fallbackErr;
      }
    }

    // ── All other sharp-native formats (JPEG, PNG, WebP, TIFF, BMP, GIF) ──
    if (SHARP_NATIVE_FORMATS.has(ext) || ext === "") {
      await sharp(unencryptedSource)
        .resize(300, 300, { fit: "cover", withoutEnlargement: false })
        .toFormat("jpeg", { quality: 85 })
        .toFile(destPath);
      logger.info(`[Thumbnail] Image thumbnail generated (${ext || "unknown"}): ${destPath}`);
      return destPath;
    }

    // ── Unknown format: attempt sharp anyway ──
    logger.warn(`[Thumbnail] Unknown image format (${ext}), attempting sharp fallback`);
    await sharp(unencryptedSource)
      .resize(300, 300, { fit: "cover" })
      .toFormat("jpeg", { quality: 85 })
      .toFile(destPath);
    return destPath;
  } catch (error) {
    logger.error(`[Thumbnail] Image thumbnail failed for ${sourcePath}: ${error.message}`);
    throw error;
  } finally {
    if (unencryptedSource && fs.existsSync(unencryptedSource)) {
      await fsPromises.unlink(unencryptedSource).catch(() => {});
    }
  }
}

// ─── Video Thumbnails ─────────────────────────────────────────────────────────

/**
 * Run a single ffmpeg thumbnail attempt
 */
function runVideoThumbnailAttempt(unencryptedPath, destPath, seekSeconds, withScale, frameOffset = 0) {
  return new Promise((resolve, reject) => {
    // Build the -vf filtergraph string.
    // ffmpeg's filtergraph parser uses commas as filter separators. Commas inside
    // a filter's argument list must be escaped as \, so ffmpeg treats them as
    // literals. Because we use execFile (no shell), this backslash arrives at
    // ffmpeg unmodified. JS "\\," → string "\," → ffmpeg sees \, → literal comma.
    const selectPrefix = frameOffset > 0 ? `select=gte(n\\,${frameOffset}),setpts=PTS-STARTPTS,` : "";
    const vf = withScale
      ? `${selectPrefix}scale=300:300:force_original_aspect_ratio=increase,crop=300:300,format=yuv420p`
      : `${selectPrefix}format=yuv420p`;

    // -ss before -i is a fast input seek; ffmpeg still decodes from the nearest
    // key-frame before the timestamp, so the output is accurate.
    const args = ["-y"];
    if (seekSeconds > 0) {
      args.push("-ss", String(seekSeconds));
    }
    args.push("-i", unencryptedPath, "-vframes", "1", "-q:v", "2", "-vf", vf, "-f", "mjpeg", destPath);

    execFile(resolvedFfmpegPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) {
        // ffmpeg exits non-zero when it can't seek/find a frame — surface the
        // full stderr so the caller knows exactly why it failed.
        reject(
          new Error(
            `ffmpeg thumbnail failed (seek=${seekSeconds}s, frame=${frameOffset}): ${err.message}\n${stderr.slice(-500)}`
          )
        );
        return;
      }
      // Raw container formats (e.g. Annex-B HEVC) silently produce 0-byte output
      // with exit code 0 when a seek overshoots — check the file size explicitly.
      // Also reject suspiciously small output (< 2 KB): this is the signature of
      // a solid-black frame that HEVC Annex-B files produce for leading IDR
      // frames before the actual content begins.  Treat anything below the same
      // MIN_THUMB_BYTES threshold used in the controller as a failed attempt so
      // the caller can try a higher frame offset.
      const MIN_VALID_JPEG_BYTES = 2000;
      const size = fs.existsSync(destPath) ? fs.statSync(destPath).size : 0;
      if (size < MIN_VALID_JPEG_BYTES) {
        reject(
          new Error(
            `ffmpeg produced ${size === 0 ? "empty" : "suspiciously-small (black frame)"} output (${size}B, seek=${seekSeconds}s, frame=${frameOffset})`
          )
        );
      } else {
        resolve(destPath);
      }
    });
  });
}

/**
 * Generates a thumbnail for any video format with duration-aware seeking and fallback chain.
 * Supports: MP4, MKV, AVI, MOV, WMV, FLV, TS, WebM, M4V, 3GP, OGV, and more.
 *
 * @param {string} sourcePath - Path to the encrypted source video
 * @param {string} destFolder - Folder to save the thumbnail
 * @param {string} filename - Thumbnail filename
 * @param {Buffer} userKey - Unwrapped DEK
 * @param {Buffer} iv - File IV
 * @returns {Promise<string>} - Path to the generated thumbnail
 */
async function generateVideoThumbnail(sourcePath, destFolder, filename, userKey, iv) {
  ensureDirectoryExists(destFolder);
  const destPath = path.join(destFolder, filename);

  logger.debug(`[Thumbnail] Generating video thumbnail: ${sourcePath}`);

  let unencryptedSource = null;
  try {
    unencryptedSource = await decryptToTemp(sourcePath, userKey, iv);

    // Check for video stream first
    const videoStreamExists = await hasVideoStream(unencryptedSource);
    if (!videoStreamExists) {
      logger.warn(`[Thumbnail] No video stream found in: ${sourcePath}`);
      throw new Error("No video stream found in file");
    }

    // Duration-aware seek: 10% of video length, capped between 0.5s and 30s
    const duration = await getVideoDuration(unencryptedSource);
    logger.debug(`[Thumbnail] Video duration: ${duration}s`);

    // Attempt chain varies by whether the container supports seeking.
    //
    // duration > 0  → container has timeline metadata; standard time-based seeks work.
    //   1. Time seek + scale + frame-5 offset (skip potential black intro frames)
    //   2. Time seek + scale
    //   3. Time seek, no scale
    //   4. Start (seek=0) + scale + frame-5 offset
    //   5. Start (seek=0) + scale
    //   6. Start (seek=0), no scale
    //
    // duration === 0 → raw bitstream (e.g. HEVC Annex-B); time seeks produce 0-byte
    //   output silently, so skip them.  Instead use the select filter to jump to a
    //   non-black frame.
    //   1. Frame-5 offset + scale
    //   2. Frame-5 offset, no scale
    //   3. Start (frame 0) + scale
    //   4. Start (frame 0), no scale
    let attempts;
    if (duration > 0) {
      const seekTime = Math.min(Math.max(duration * 0.1, 0.5), 30);
      logger.debug(`[Thumbnail] Seek-capable file, target: ${seekTime.toFixed(1)}s`);
      attempts = [
        { seek: seekTime, scale: true, frameOffset: 5, label: `seek ${seekTime.toFixed(1)}s + frame5 + scale` },
        { seek: seekTime, scale: true, frameOffset: 0, label: `seek ${seekTime.toFixed(1)}s + scale` },
        { seek: seekTime, scale: false, frameOffset: 0, label: `seek ${seekTime.toFixed(1)}s no scale` },
        { seek: 0, scale: true, frameOffset: 5, label: "start + frame5 + scale" },
        { seek: 0, scale: true, frameOffset: 0, label: "start + scale" },
        { seek: 0, scale: false, frameOffset: 0, label: "start no scale" },
      ];
    } else {
      logger.debug(`[Thumbnail] No seekable duration — using frame-select approach`);
      // HEVC Annex-B and similar raw bitstreams often have multiple leading
      // black IDR frames before actual content begins.  We expand the attempt
      // chain to progressively skip more frames until we get a non-black result.
      // runVideoThumbnailAttempt rejects outputs < 2 KB (black frames), so each
      // "failed" attempt naturally advances to the next higher offset.
      attempts = [
        { seek: 0, scale: true, frameOffset: 5, label: "frame5 + scale" },
        { seek: 0, scale: true, frameOffset: 30, label: "frame30 + scale" },
        { seek: 0, scale: true, frameOffset: 60, label: "frame60 + scale" },
        { seek: 0, scale: true, frameOffset: 100, label: "frame100 + scale" },
        { seek: 0, scale: false, frameOffset: 30, label: "frame30 no scale" },
        { seek: 0, scale: false, frameOffset: 5, label: "frame5 no scale" },
        { seek: 0, scale: false, frameOffset: 0, label: "frame0 no scale" },
        { seek: 0, scale: true, frameOffset: 0, label: "frame0 + scale" },
      ];
    }

    for (const attempt of attempts) {
      try {
        await runVideoThumbnailAttempt(unencryptedSource, destPath, attempt.seek, attempt.scale, attempt.frameOffset);
        logger.info(`[Thumbnail] Video thumbnail generated (${attempt.label}): ${destPath}`);
        return destPath;
      } catch (err) {
        logger.warn(`[Thumbnail] Attempt failed (${attempt.label}): ${err.message}`);
      }
    }

    throw new Error(`Video thumbnail generation failed for: ${sourcePath}`);
  } finally {
    if (unencryptedSource && fs.existsSync(unencryptedSource)) {
      await fsPromises.unlink(unencryptedSource).catch(() => {});
    }
  }
}

// ─── On-the-fly Pipe Transcode ────────────────────────────────────────────────

/**
 * On-the-fly transcode: pipes ffmpeg output directly to an HTTP response.
 * Zero disk usage — converted bytes flow from ffmpeg → memory → client.
 *
 * Uses fragmented MP4 (frag_keyframe + empty_moov) so the browser can start
 * playback immediately without needing the full file written first.
 *
 * @param {string} sourcePath - Path to the source video file
 * @param {import('express').Response} res - Express response to pipe into
 * @returns {Promise<void>}
 */
function pipeTranscode(sourcePath, res) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      sourcePath,
      // Map video unconditionally; map audio only if it exists (? = optional).
      // Without this, ffmpeg errors when the source has no audio (e.g. raw HEVC).
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      // Fragmented MP4 — enables streaming without seek/faststart
      "-movflags",
      "frag_keyframe+empty_moov+default_base_moof",
      "-f",
      "mp4",
      "pipe:1",
    ];

    logger.debug(`[FFMPEG] Pipe transcode: ${resolvedFfmpegPath} ${args.join(" ")}`);
    const proc = spawn(resolvedFfmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });

    proc.stdout.pipe(res, { end: true });

    let stderrBuf = "";
    proc.stderr.on("data", (d) => {
      stderrBuf += d.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`[FFMPEG] Pipe transcode exited ${code}:\n${stderrBuf.slice(-500)}`);
        reject(new Error(`ffmpeg pipe transcode failed with code ${code}`));
      } else {
        logger.info("[FFMPEG] Pipe transcode complete for:", sourcePath);
        resolve();
      }
    });

    proc.on("error", (err) => {
      logger.error("[FFMPEG] Pipe transcode spawn error:", err.message);
      reject(err);
    });

    // Client disconnected — stop the transcode gracefully
    res.on("close", () => {
      if (!proc.killed) {
        proc.kill("SIGTERM");
        logger.debug("[FFMPEG] Client disconnected — pipe transcode killed");
        resolve();
      }
    });
  });
}

/**
 * On-the-fly transcode using a stream as input instead of a file path.
 * Invaluable for transcoder setups where the input is a decipher stream.
 *
 * @param {stream.Readable} sourceStream
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
function pipeTranscodeStream(sourceStream, res) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      "pipe:0",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-movflags",
      "frag_keyframe+empty_moov+default_base_moof",
      "-f",
      "mp4",
      "pipe:1",
    ];

    logger.debug(`[FFMPEG] Pipe transcode stream: ${resolvedFfmpegPath} ${args.join(" ")}`);
    const proc = spawn(resolvedFfmpegPath, args, { stdio: ["pipe", "pipe", "pipe"] });

    // Feed encrypted-decrypted source into ffmpeg's stdin
    sourceStream.pipe(proc.stdin);
    proc.stdout.pipe(res, { end: true });

    let stderrBuf = "";
    proc.stderr.on("data", (d) => {
      stderrBuf += d.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`[FFMPEG] Pipe stream transcode exited ${code}:\n${stderrBuf.slice(-500)}`);
        reject(new Error(`ffmpeg pipe stream transcode failed with code ${code}`));
      } else {
        logger.info("[FFMPEG] Pipe stream transcode complete");
        resolve();
      }
    });

    proc.on("error", (err) => {
      logger.error("[FFMPEG] Pipe stream transcode spawn error:", err.message);
      reject(err);
    });

    // Client disconnected — stop the transcode and close stdin gracefully
    res.on("close", () => {
      if (!proc.killed) {
        proc.kill("SIGTERM");
        logger.debug("[FFMPEG] Client disconnected — pipe stream transcode killed");
        resolve();
      }
    });

    sourceStream.on("error", (err) => {
      if (!proc.killed) {
        proc.kill("SIGTERM");
      }
      reject(err);
    });
  });
}

/**
 * HEVC/H.265 codec identifiers reported by ffprobe
 */
const HEVC_CODECS = new Set(["hevc", "h265", "h.265", "hvc1", "hev1"]);

/**
 * HEVC/H.265 MIME types that browsers cannot decode natively
 */
const HEVC_MIMES = new Set(["video/hevc", "video/x-hevc", "video/h265", "video/x-h265"]);

/**
 * File extensions that are always HEVC (regardless of MIME or metadata)
 */
const HEVC_EXTENSIONS = new Set([".hevc", ".h265", ".265"]);

/**
 * Determines if a video file needs server-side transcoding before the browser can play it.
 *
 * Checks in priority order:
 *   1. Explicit codec from ffprobe metadata (most accurate — catches HEVC-in-MP4)
 *   2. HEVC-specific MIME types
 *   3. HEVC-specific file extensions
 *   4. Container-level check (MP4/WebM are natively supported; everything else is not)
 *
 * @param {string} filePath  - Storage path (used for extension fallback)
 * @param {string} mimeType  - File MIME type
 * @param {string} [codec]   - Video codec from file metadata (e.g. file.metadata?.codec)
 *                             Pass this to correctly detect HEVC-in-MP4 which browsers cannot play.
 * @returns {boolean}        - true = needs transcoding, false = browser-native
 */
function needsVideoPreview(filePath, mimeType, codec) {
  // 1. Codec check — most reliable, detects HEVC-in-MP4/MOV regardless of container
  if (codec && HEVC_CODECS.has(codec.toLowerCase())) {
    return true;
  }

  // 2. MIME type check for explicit HEVC mime strings
  if (mimeType && HEVC_MIMES.has(mimeType.toLowerCase())) {
    return true;
  }

  // 3. Extension check — covers .hevc / .h265 bare files
  const ext = path.extname(filePath).toLowerCase();
  if (HEVC_EXTENSIONS.has(ext)) {
    return true;
  }

  // 4. Container check — MP4/WebM/M4V are browser-native (assuming H.264/VP9 codec)
  if (mimeType === "video/mp4" || mimeType === "video/webm" || mimeType === "video/x-m4v") {
    return false;
  }
  if (ext === ".mp4" || ext === ".webm" || ext === ".m4v") {
    return false;
  }

  // All other formats (MOV, MKV, AVI, etc.) need transcoding for broad browser support
  return true;
}

/**
 * Generates a waveform image from an audio file.
 */
function generateAudioWaveform(sourcePath, destPath) {
  ensureDirectoryExists(path.dirname(destPath));

  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      sourcePath,
      "-filter_complex",
      "showwavespic=s=800x200:colors=0088FF",
      "-frames:v",
      "1",
      "-f",
      "mjpeg",
      destPath,
    ];

    logger.debug(`[FFMPEG] Waveform command: ${resolvedFfmpegPath} ${args.join(" ")}`);
    execFile(resolvedFfmpegPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) {
        logger.error(`[FFMPEG] Waveform error: ${err.message}\n${stderr.slice(-300)}`);
        reject(new Error(`Waveform generation failed: ${err.message}`));
      } else {
        logger.info("[FFMPEG] Waveform generated:", destPath);
        resolve(destPath);
      }
    });
  });
}

// ─── HLS Full Transcode ───────────────────────────────────────────────────────

// In-memory lock: prevents concurrent full-file transcodes for the same fileId
const hlsTranscodeLocks = new Map();

/**
 * Transcodes an entire encrypted media file to HLS format using ffmpeg's native
 * HLS muxer. Produces a continuous segment timeline so timestamps are correct
 * across all segments — no per-segment seeking issues or audio discontinuities.
 *
 * @param {string} storagePath    - Encrypted file path on disk
 * @param {Buffer} userKey        - Unwrapped DEK
 * @param {Buffer} iv             - File IV
 * @param {string} outputDir      - Directory where segments + playlist are written
 * @param {number} segmentDuration - Target segment length in seconds
 * @param {boolean} isAudioOnly   - If true, skip video codec options
 * @returns {Promise<void>}
 */
async function transcodeToHls(storagePath, userKey, iv, outputDir, segmentDuration, isAudioOnly) {
  // If another request is already transcoding this exact output dir, wait for it
  if (hlsTranscodeLocks.has(outputDir)) {
    await hlsTranscodeLocks.get(outputDir);
    return;
  }

  let resolveLock;
  const lockPromise = new Promise((r) => {
    resolveLock = r;
  });
  hlsTranscodeLocks.set(outputDir, lockPromise);

  let tempPath = null;
  try {
    await fsPromises.mkdir(outputDir, { recursive: true });
    tempPath = await decryptToTemp(storagePath, userKey, iv);

    // Probe whether the decoded file has an audio stream.
    // Raw container formats (e.g. Annex-B HEVC bitstream) never carry audio;
    // including [0:a] in the filter_complex when there is no audio stream makes
    // ffmpeg error and write zero segments.
    let inputHasAudio = false;
    try {
      const probeData = await probeVideo(tempPath);
      inputHasAudio = probeData.streams.some((s) => s.codec_type === "audio");
    } catch {
      inputHasAudio = false;
    }

    const segmentPattern = path.join(outputDir, "seg-%d.ts");
    const playlistPath = path.join(outputDir, "playlist.m3u8");

    // Use execFile with precise arg ordering — fluent-ffmpeg reorders -map/-vf/-af
    // flags in ways that break filter_complex stream association.
    //
    // filter_complex with setpts=PTS-STARTPTS/asetpts=PTS-STARTPTS is the only
    // reliable way to force both streams to start at PTS=0, regardless of the
    // MKV container clock offset (~1.4s for Vorbis MKVs).
    const args = isAudioOnly
      ? [
          "-y",
          "-i",
          tempPath,
          "-filter_complex",
          "[0:a]asetpts=PTS-STARTPTS[a]",
          "-map",
          "[a]",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-f",
          "hls",
          "-hls_time",
          String(segmentDuration),
          "-hls_list_size",
          "0",
          "-hls_flags",
          "independent_segments",
          "-hls_segment_filename",
          segmentPattern,
          "-max_muxing_queue_size",
          "9999",
          playlistPath,
        ]
      : inputHasAudio
        ? [
            // Video + audio: use filter_complex to reset both PTS streams to 0
            // (required for MKV/Vorbis containers with non-zero start offsets).
            // format=yuv420p inside the video chain handles 10-bit HEVC input
            // which libx264 cannot encode natively.
            "-y",
            "-i",
            tempPath,
            "-filter_complex",
            "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,setpts=PTS-STARTPTS[v];[0:a]asetpts=PTS-STARTPTS[a]",
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "fast",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-f",
            "hls",
            "-hls_time",
            String(segmentDuration),
            "-hls_list_size",
            "0",
            "-hls_flags",
            "independent_segments",
            "-hls_segment_filename",
            segmentPattern,
            "-max_muxing_queue_size",
            "9999",
            playlistPath,
          ]
        : [
            // Video-only (e.g. raw HEVC/H.265 Annex-B bitstream — no audio track).
            // format=yuv420p converts 10-bit HDR input to 8-bit for libx264.
            "-y",
            "-i",
            tempPath,
            "-filter_complex",
            "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,setpts=PTS-STARTPTS[v]",
            "-map",
            "[v]",
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "fast",
            "-an",
            "-f",
            "hls",
            "-hls_time",
            String(segmentDuration),
            "-hls_list_size",
            "0",
            "-hls_flags",
            "independent_segments",
            "-hls_segment_filename",
            segmentPattern,
            "-max_muxing_queue_size",
            "9999",
            playlistPath,
          ];

    logger.info(`[HLS] Full transcode started: ${resolvedFfmpegPath} ${args.join(" ")}`);

    await new Promise((resolve, reject) => {
      execFile(resolvedFfmpegPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          logger.error(`[HLS] Transcode failed:\n${stderr}`);
          reject(new Error(`HLS full transcode failed: ${err.message}`));
        } else {
          logger.info(`[HLS] Full transcode complete: ${outputDir}`);
          resolve();
        }
      });
    });
  } finally {
    if (tempPath) {
      await fsPromises.unlink(tempPath).catch(() => {});
    }
    hlsTranscodeLocks.delete(outputDir);
    resolveLock();
  }
}

// ─── Audio Album Art ──────────────────────────────────────────────────────────

/**
 * Extracts album art from an audio file and saves it as a JPEG.
 * Falls back to generating a waveform image if no album art is found.
 */
async function extractAudioAlbumArt(sourcePath, destPath, userKey, iv) {
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);

  let unencryptedSource = null;

  try {
    unencryptedSource = await decryptToTemp(sourcePath, userKey, iv);

    // Step 1: Try to extract embedded album art
    try {
      const { parseFile } = await import("music-metadata");
      const metadata = await parseFile(unencryptedSource);

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        await sharp(picture.data).resize(300, 300, { fit: "cover" }).toFormat("jpeg", { quality: 85 }).toFile(destPath);
        logger.info("[Thumbnail] Audio album art extracted:", destPath);
        return destPath;
      }
    } catch (err) {
      logger.warn(`[Thumbnail] Album art extraction failed for ${sourcePath}: ${err.message}`);
    }

    // Step 2: Fallback — generate a waveform image
    try {
      await generateAudioWaveform(unencryptedSource, destPath);
      return destPath;
    } catch (waveErr) {
      logger.warn(`[Thumbnail] Waveform fallback also failed for ${sourcePath}: ${waveErr.message}`);
    }

    throw new Error(`No album art or waveform could be generated for: ${sourcePath}`);
  } finally {
    if (unencryptedSource && fs.existsSync(unencryptedSource)) {
      await fsPromises.unlink(unencryptedSource).catch(() => {});
    }
  }
}

// ─── ZIP Streaming ────────────────────────────────────────────────────────────

/**
 * Creates a ZIP archive from a list of files and folders and streams it to an output stream.
 */
function createZipStream(items, outputStream) {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (err) => {
      logger.error("[ZIP] Archiver error:", err.message);
      reject(err);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        logger.warn("[ZIP] Archiver warning:", err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(outputStream);

    for (const item of items) {
      if (item.type === "file") {
        if (fs.existsSync(item.path)) {
          if (item.userKey && item.iv) {
            // Decrypt on the fly into the archive
            const decipher = CryptoUtils.getDecipherStream(item.userKey, item.iv);
            const sourceStream = fs.createReadStream(item.path);

            // Decipher streams don't have all the stat metadata archiver needs,
            // so we must provide the name explicitly
            archive.append(sourceStream.pipe(decipher), { name: item.name });
          } else {
            // Fallback for unencrypted files (if any still existed)
            archive.file(item.path, { name: item.name });
          }
        } else {
          logger.warn(`[ZIP] File not found, skipping: ${item.path}`);
        }
      } else if (item.type === "folder") {
        if (fs.existsSync(item.path)) {
          archive.directory(item.path, item.name);
        } else {
          logger.warn(`[ZIP] Folder not found, skipping: ${item.path}`);
        }
      }
    }

    archive.on("end", () => {
      logger.info(`[ZIP] Finished bundling ${items.length} items`);
      resolve();
    });

    archive.finalize();
  });
}

/**
 * Relocates the 'moov' atom to the front of the file (Fast Start) for web optimization.
 */
function relocateMoovAtom(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    logger.info(`[FFMPEG] Starting moov relocation: ${path.basename(sourcePath)} -> ${path.basename(destPath)}`);
    execFile(
      resolvedFfmpegPath,
      ["-y", "-i", sourcePath, "-c", "copy", "-map", "0:v?", "-map", "0:a?", "-movflags", "+faststart", destPath],
      { timeout: 300000 },
      (err, stdout, stderr) => {
        if (err) {
          logger.error(`[FFMPEG] Moov relocation failed: ${stderr || err.message}`);
          return reject(err);
        }
        logger.info(`[FFMPEG] Moov relocation successful: ${path.basename(destPath)}`);
        resolve(destPath);
      }
    );
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const MediaUtils = {
  generateImageThumbnail,
  generateVideoThumbnail,
  pipeTranscode,
  pipeTranscodeStream,
  extractAudioAlbumArt,
  generateAudioWaveform,
  createZipStream,
  needsVideoPreview,
  relocateMoovAtom,
  probeEncryptedMedia,
  transcodeToHls,
  BROWSER_NATIVE_VIDEO_FORMATS,
  BROWSER_NATIVE_AUDIO_MIMES,
  AUDIO_FORMATS_WITH_ART,
  SHARP_NATIVE_FORMATS,
  RAW_IMAGE_FORMATS,
  HEIC_FORMATS,
};

export default MediaUtils;
