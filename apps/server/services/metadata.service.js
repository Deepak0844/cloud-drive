import FileUtils from "../utils/fileUtils.js";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import * as mm from "music-metadata";
import ExifParser from "exif-parser";
import fs from "fs";
import crypto from "crypto";

ffmpeg.setFfprobePath(ffprobePath);

/**
 * Determine the category based on MIME type and extension
 */
function getCategory(mimeType, filename) {
  const ext = FileUtils.getFileExtension(filename).toLowerCase();

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "tiff", "tif", "bmp", "svg"];
  const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "3gp"];
  const audioExts = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "wma"];

  if (mimeType.startsWith("image/") || imageExts.includes(ext)) {
    return "image";
  }
  if (mimeType.startsWith("video/") || videoExts.includes(ext)) {
    return "video";
  }
  if (mimeType.startsWith("audio/") || audioExts.includes(ext)) {
    return "audio";
  }

  const docs = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md"];
  if (docs.includes(ext) || mimeType.includes("document") || mimeType.includes("pdf") || mimeType.includes("text")) {
    return "document";
  }

  const archives = ["zip", "rar", "7z", "tar", "gz"];
  if (archives.includes(ext) || mimeType.includes("zip") || mimeType.includes("archive")) {
    return "archive";
  }

  return "other";
}

/**
 * Promise wrapper for ffprobe
 */
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Extract metadata based on file type
 */
async function extractMetadata(filePath, category) {
  const metadata = {};
  const extra = {};

  try {
    if (category === "image") {
      const imageInfo = await sharp(filePath).metadata();
      metadata.width = imageInfo.width;
      metadata.height = imageInfo.height;
      metadata.format = imageInfo.format;

      // EXIF Parsing for GPS and DateTaken
      try {
        const buffer = fs.readFileSync(filePath);
        const parser = ExifParser.create(buffer);
        const result = parser.parse();

        if (result.tags) {
          if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
            extra.gps = {
              lat: result.tags.GPSLatitude,
              lng: result.tags.GPSLongitude,
            };
          }
          if (result.tags.DateTimeOriginal) {
            extra.taken_at = new Date(result.tags.DateTimeOriginal * 1000);
          }
        }
      } catch (exifErr) {
        console.warn("EXIF extraction failed:", exifErr.message);
      }
    } else if (category === "video") {
      const probeData = await probeFile(filePath);
      if (probeData.streams) {
        const videoStream = probeData.streams.find((s) => s.codec_type === "video");
        const audioStream = probeData.streams.find((s) => s.codec_type === "audio");

        metadata.duration = parseFloat(probeData.format.duration);
        metadata.bitrate = parseInt(probeData.format.bit_rate);

        if (videoStream) {
          metadata.width = videoStream.width;
          metadata.height = videoStream.height;
          metadata.codec = videoStream.codec_name;

          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split("/");
            metadata.fps = den && den !== "0" ? parseFloat(num) / parseFloat(den) : parseFloat(num);
          }
        }

        if (audioStream) {
          metadata.audioCodec = audioStream.codec_name;
          metadata.channels = audioStream.channels;
          metadata.sampleRate = parseInt(audioStream.sample_rate);
        }
      }
    } else if (category === "audio") {
      const audioInfo = await mm.parseFile(filePath);
      metadata.duration = audioInfo.format.duration;
      metadata.bitrate = audioInfo.format.bitrate;
      metadata.sampleRate = audioInfo.format.sampleRate;
      metadata.channels = audioInfo.format.numberOfChannels;

      extra.audio_metadata = {
        artist: audioInfo.common.artist,
        album: audioInfo.common.album,
        title: audioInfo.common.title,
        genre: audioInfo.common.genre ? audioInfo.common.genre[0] : null,
        year: audioInfo.common.year,
      };

      // Extract album art if available and set as thumbnail later in service
      if (audioInfo.common.picture && audioInfo.common.picture.length > 0) {
        extra.hasAlbumArt = true;
        // The service can handle writing this to a file
      }
    }
  } catch (error) {
    console.error(`Metadata extraction failed for ${filePath}:`, error);
  }

  return { metadata, extra };
}

/**
 * Calculate MD5 hash of a file
 * @param {String} filePath - Path to the file
 * @returns {Promise<String>} - MD5 hash
 */
function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

const MetadataService = {
  getCategory,
  extractMetadata,
  probeFile,
  calculateHash,
};

export default MetadataService;
