import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a test file buffer
 */
export function createTestFile(_, content = "test content") {
  return Buffer.from(content);
}

/**
 * Create a test image buffer
 */
export function createTestImage() {
  // 1x1 PNG image
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  return pngBuffer;
}

/**
 * Get path to test fixtures
 */
export function getFixturePath(filename) {
  return path.join(__dirname, "../fixtures", filename);
}

/**
 * Clean up test uploads directory
 */
export async function cleanupTestUploads(uploadsDir) {
  if (fs.existsSync(uploadsDir)) {
    const files = await fs.promises.readdir(uploadsDir);
    for (const file of files) {
      await fs.promises.unlink(path.join(uploadsDir, file));
    }
  }
}
