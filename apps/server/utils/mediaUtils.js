/**
 * mediaUtils.js
 *
 * Core media-processing utilities: encrypted media probing, on-the-fly transcoding,
 * HLS segment generation, and moov-atom relocation.
 *
 * All thumbnail/album-art code lives in thumbnailUtils.js.
 * ZIP streaming lives in zipUtils.js.
 * Shared ffmpeg helpers and format registries live in mediaCore.js.
 *
 * This file re-exports everything from those modules so existing callers can
 * continue to import a single MediaUtils object without changes.
 */

// Native modules
import { execFile, spawn } from "child_process";
import fsPromises from "fs/promises";
import path from "path";

// Core helpers (shared with thumbnailUtils)
import {
  resolvedFfmpegPath,
  BROWSER_NATIVE_VIDEO_FORMATS,
  BROWSER_NATIVE_AUDIO_MIMES,
  AUDIO_FORMATS_WITH_ART,
  SHARP_NATIVE_FORMATS,
  RAW_IMAGE_FORMATS,
  HEIC_FORMATS,
  decryptToTemp,
  probeVideo,
} from "#utils/mediaCore.js";

// Sub-modules (re-exported for backward compat)
import ThumbnailUtils from "#utils/thumbnailUtils.js";
import ZipUtils from "#utils/zipUtils.js";

// Utils
import logger from "#utils/logger.js";
import { MediaProcessing, HlsConfig } from "#constants/generalConstants.js";

const { TRANSCODE_CRF, TRANSCODE_AUDIO_BITRATE, MOOV_RELOCATION_TIMEOUT_MS } = MediaProcessing;
const { TRANSCODE_PRESET } = HlsConfig;

// ─── Media Probe (Encrypted) ──────────────────────────────────────────────────

/**
 * Probes an encrypted media file and returns its metadata.
 * Decrypts to a temp file first so ffprobe can seek freely.
 *
 * @param {string} storagePath  - Encrypted file path on disk
 * @param {Buffer} userKey      - Unwrapped DEK
 * @param {Buffer} iv           - File IV
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

// ─── On-the-fly Pipe Transcode ─────────────────────────────────────────────────

/**
 * Transcodes a file path to a fragmented MP4 stream piped directly to an HTTP response.
 * Uses fragmented MP4 (frag_keyframe + empty_moov) for immediate browser playback.
 *
 * @param {string} sourcePath
 * @param {import('express').Response} res
 */
function pipeTranscode(sourcePath, res) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      sourcePath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-crf",
      TRANSCODE_CRF,
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      TRANSCODE_AUDIO_BITRATE,
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
 * Transcodes a readable stream (e.g. decrypt stream) to a fragmented MP4 piped to a response.
 *
 * @param {import('stream').Readable} sourceStream
 * @param {import('express').Response} res
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
      TRANSCODE_CRF,
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      TRANSCODE_AUDIO_BITRATE,
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

// ─── Video Preview Detection ───────────────────────────────────────────────────

const HEVC_CODECS = new Set(["hevc", "h265", "h.265", "hvc1", "hev1"]);
const HEVC_MIMES = new Set(["video/hevc", "video/x-hevc", "video/h265", "video/x-h265"]);
const HEVC_EXTENSIONS = new Set([".hevc", ".h265", ".265"]);

/**
 * Determines if a video file needs server-side transcoding before the browser can play it.
 *
 * @param {string}  filePath - Storage path (used for extension fallback)
 * @param {string}  mimeType - File MIME type
 * @param {string}  [codec]  - Video codec from file metadata (file.metadata?.codec)
 * @returns {boolean}        - true = needs transcoding, false = browser-native
 */
function needsVideoPreview(filePath, mimeType, codec) {
  if (codec && HEVC_CODECS.has(codec.toLowerCase())) {
    return true;
  }
  if (mimeType && HEVC_MIMES.has(mimeType.toLowerCase())) {
    return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (HEVC_EXTENSIONS.has(ext)) {
    return true;
  }
  if (mimeType === "video/mp4" || mimeType === "video/webm" || mimeType === "video/x-m4v") {
    return false;
  }
  if (ext === ".mp4" || ext === ".webm" || ext === ".m4v") {
    return false;
  }
  return true;
}

// ─── HLS Session Args Builder ────────────────────────────────────────────────────

/**
 * Builds the ffmpeg argv for an anchored HLS transcode session.
 *
 * A session encodes linearly from `anchorSegment * segmentDuration` to the end of the
 * source, emitting seg-<anchorSegment>.ts, seg-<anchorSegment+1>.ts, ... onto the SAME
 * fixed segment grid the precomputed master playlist promises:
 *   - `-ss` input-seeks to the anchor; the run's output timeline restarts at t=0.
 *   - `-force_key_frames expr:gte(t,n_forced*D)` forces an IDR every D seconds from t=0,
 *     so each segment is independently decodable and boundaries land on the grid.
 *   - `-output_ts_offset` shifts the run onto the global timeline, so segment K's internal
 *     timestamps reflect global [K*D, (K+1)*D) and the player stitches it correctly when
 *     the segment is loaded via the master playlist.
 *   - `-start_number K` names files seg-K.ts onward.
 *   - `independent_segments+temp_file` => each .ts is written to a temp name and renamed
 *     atomically, so a reader never observes a partially-written segment.
 *
 * Source resolution is preserved (only normalized to even dimensions, which libx264
 * requires) per ratified sub-decision §7.1 — no downscale.
 *
 * Pure function (no spawn) — process management lives in hlsSessionUtils.
 *
 * @param {object}  opts
 * @param {string}  opts.sourcePath      - Decrypted source file (seekable)
 * @param {string}  opts.cacheDir        - Output dir for seg-*.ts + throwaway session playlist
 * @param {number}  opts.anchorSegment   - Segment index this session starts at (K)
 * @param {number}  opts.segmentDuration - Segment length in seconds (D)
 * @param {boolean} opts.isAudioOnly     - Omit video options when true
 * @returns {string[]} ffmpeg argv
 */
function buildHlsSessionArgs({ sourcePath, cacheDir, anchorSegment, segmentDuration, isAudioOnly }) {
  const anchorSeconds = anchorSegment * segmentDuration;
  const segmentPattern = path.join(cacheDir, "seg-%d.ts");
  const sessionPlaylist = path.join(cacheDir, `session-${anchorSegment}.m3u8`);

  // Shared HLS muxer tail — grid alignment + atomic writes + global-timeline offset
  const hlsTail = [
    "-avoid_negative_ts",
    "make_zero",
    "-f",
    "hls",
    "-hls_time",
    String(segmentDuration),
    "-hls_list_size",
    "0",
    "-output_ts_offset",
    String(anchorSeconds),
    "-hls_flags",
    "independent_segments+temp_file",
    "-start_number",
    String(anchorSegment),
    "-hls_segment_filename",
    segmentPattern,
    "-muxdelay",
    "0",
    "-max_muxing_queue_size",
    "9999",
    sessionPlaylist,
  ];

  if (isAudioOnly) {
    return [
      "-y",
      "-ss",
      String(anchorSeconds),
      "-i",
      sourcePath,
      "-map",
      "0:a:0",
      "-c:a",
      "aac",
      "-b:a",
      TRANSCODE_AUDIO_BITRATE,
      "-af",
      "asetpts=PTS-STARTPTS",
      ...hlsTail,
    ];
  }

  return [
    "-y",
    "-ss",
    String(anchorSeconds),
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    TRANSCODE_PRESET,
    "-crf",
    TRANSCODE_CRF,
    "-vf",
    "setpts=PTS-STARTPTS,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
    "-force_key_frames",
    `expr:gte(t,n_forced*${segmentDuration})`,
    "-c:a",
    "aac",
    "-b:a",
    TRANSCODE_AUDIO_BITRATE,
    "-af",
    "asetpts=PTS-STARTPTS",
    ...hlsTail,
  ];
}

// ─── Moov Atom Relocation ──────────────────────────────────────────────────────

/**
 * Relocates the 'moov' atom to the front of an MP4/MOV file (Fast Start web optimization).
 *
 * @param {string} sourcePath
 * @param {string} destPath
 * @returns {Promise<string>}
 */
function relocateMoovAtom(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    logger.info(`[FFMPEG] Starting moov relocation: ${path.basename(sourcePath)} -> ${path.basename(destPath)}`);
    execFile(
      resolvedFfmpegPath,
      ["-y", "-i", sourcePath, "-c", "copy", "-map", "0:v?", "-map", "0:a?", "-movflags", "+faststart", destPath],
      { timeout: MOOV_RELOCATION_TIMEOUT_MS },
      (err, _stdout, stderr) => {
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

// ─── Exports ───────────────────────────────────────────────────────────────────

const MediaUtils = {
  // Probe
  probeEncryptedMedia,

  // Transcode
  pipeTranscode,
  pipeTranscodeStream,
  buildHlsSessionArgs,
  needsVideoPreview,
  relocateMoovAtom,

  // Format registries (re-exported from mediaCore)
  BROWSER_NATIVE_VIDEO_FORMATS,
  BROWSER_NATIVE_AUDIO_MIMES,
  AUDIO_FORMATS_WITH_ART,
  SHARP_NATIVE_FORMATS,
  RAW_IMAGE_FORMATS,
  HEIC_FORMATS,

  // Thumbnails (re-exported from thumbnailUtils)
  ...ThumbnailUtils,

  // ZIP (re-exported from zipUtils)
  ...ZipUtils,
};

export default MediaUtils;
