import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Utils
import {
  cleanupFile,
  fileExists,
  sanitizeFilename,
  getFileExtension,
  getFilenameWithoutExtension,
} from "../../../utils/fileUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("FileUtils", () => {
  const testDir = path.join(__dirname, "../../temp-test");
  const testFile = path.join(testDir, "test.txt");

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("fileExists", () => {
    it("should return true for existing file", () => {
      fs.writeFileSync(testFile, "test");
      expect(fileExists(testFile)).toBe(true);
      fs.unlinkSync(testFile);
    });

    it("should return false for non-existing file", () => {
      expect(fileExists(testFile)).toBe(false);
    });
  });

  describe("cleanupFile", () => {
    it("should delete existing file", () => {
      fs.writeFileSync(testFile, "test");
      const result = cleanupFile(testFile);
      expect(result).toBe(true);
      expect(fileExists(testFile)).toBe(false);
    });

    it("should return false for non-existing file", () => {
      const result = cleanupFile(testFile);
      expect(result).toBe(false);
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove dangerous characters", () => {
      expect(sanitizeFilename("test/file.txt")).toBe("test_file.txt");
      expect(sanitizeFilename("test\\file.txt")).toBe("test_file.txt");
      expect(sanitizeFilename("test?file.txt")).toBe("test_file.txt");
    });

    it("should replace spaces with underscores", () => {
      expect(sanitizeFilename("test file.txt")).toBe("test_file.txt");
    });

    it("should collapse multiple underscores", () => {
      expect(sanitizeFilename("test___file.txt")).toBe("test_file.txt");
    });
  });

  describe("getFileExtension", () => {
    it("should extract file extension", () => {
      expect(getFileExtension("test.txt")).toBe("txt");
      expect(getFileExtension("test.PDF")).toBe("pdf");
      expect(getFileExtension("archive.tar.gz")).toBe("gz");
    });

    it("should return empty string for no extension", () => {
      expect(getFileExtension("test")).toBe("");
      expect(getFileExtension(".gitignore")).toBe("");
    });
  });

  describe("getFilenameWithoutExtension", () => {
    it("should remove extension", () => {
      expect(getFilenameWithoutExtension("test.txt")).toBe("test");
      expect(getFilenameWithoutExtension("archive.tar.gz")).toBe("archive.tar");
    });

    it("should return full name if no extension", () => {
      expect(getFilenameWithoutExtension("test")).toBe("test");
    });
  });
});
