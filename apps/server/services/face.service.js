import * as faceapi from "face-api.js";
import canvas from "canvas";
import path from "path";
import fs from "fs";
import logger from "../utils/logger.js";
import File from "../models/File.js";

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

/**
 * Load face-api models from the filesystem
 */
async function loadModels() {
  if (modelsLoaded) {
    return;
  }

  const modelPath = path.resolve("assets/models");
  if (!fs.existsSync(modelPath)) {
    fs.mkdirSync(modelPath, { recursive: true });
    logger.warn("Face-api models directory created. Please add model weights to assets/models");
    return;
  }

  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    modelsLoaded = true;
    logger.info("Face-api models loaded successfully");
  } catch (err) {
    logger.error("Failed to load face-api models:", err.message);
  }
}

/**
 * Detect faces in an image and store metadata
 * @param {Object} file - File model instance
 */
async function detectFaces(file) {
  if (file.category !== "image") {
    return;
  }

  await loadModels();
  if (!modelsLoaded) {
    return;
  }

  try {
    const img = await canvas.loadImage(file.storage_path);
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

    if (detections.length > 0) {
      const faceData = detections.map((det) => ({
        box: det.detection.box,
        score: det.detection.score,
        // We could store descriptors for recognition, but let's start with count/boxes
      }));

      await File.findByIdAndUpdate(file._id, {
        $set: { "metadata.faces": faceData, "metadata.face_count": detections.length },
      });

      logger.info(`Detected ${detections.length} faces in ${file.name}`);
    }
  } catch (err) {
    logger.error(`Face detection failed for ${file.name}:`, err.message);
  }
}

const FaceService = {
  detectFaces,
};

export default FaceService;
