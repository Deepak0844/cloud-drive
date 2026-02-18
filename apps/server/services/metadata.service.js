import FileUtils from "../utils/fileUtils.js";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";

ffmpeg.setFfprobePath(ffprobePath);

/**
 * Determine the category based on MIME type and extension
 */
function getCategory(mimeType, filename) {
  const ext = FileUtils.getFileExtension(filename);

  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
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

  try {
    if (category === "image") {
      const imageInfo = await sharp(filePath).metadata();
      metadata.width = imageInfo.width;
      metadata.height = imageInfo.height;
      metadata.format = imageInfo.format;
      metadata.hasAlpha = imageInfo.hasAlpha;
      if (imageInfo.exif) {
        // EXIF parsing could be deeper if needed, but start with dimensions
        metadata.hasExif = true;
      }
    } else if (category === "video" || category === "audio") {
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

          // Safely parse fps (e.g. "30/1" or "24000/1001")
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
    }
  } catch (error) {
    console.error(`Metadata extraction failed for ${filePath}:`, error);
  }

  return metadata;
}

const MetadataService = {
  getCategory,
  extractMetadata,
  probeFile,
};

export default MetadataService;
