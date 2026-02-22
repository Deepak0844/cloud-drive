// Utils
import { formatStorageSize, bytesToGB, bytesToMB, gbToBytes } from "../../../utils/formatUtils.js";

describe("FormatUtils", () => {
  describe("formatStorageSize", () => {
    it("should format bytes correctly", () => {
      expect(formatStorageSize(0)).toBe("0 B");
      expect(formatStorageSize(500)).toBe("500.00 B");
      expect(formatStorageSize(1024)).toBe("1.00 KB");
      expect(formatStorageSize(1024 * 1024)).toBe("1.00 MB");
      expect(formatStorageSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    });

    it("should respect decimal places", () => {
      expect(formatStorageSize(1536, 0)).toBe("2 KB");
      expect(formatStorageSize(1536, 1)).toBe("1.5 KB");
      expect(formatStorageSize(1536, 3)).toBe("1.500 KB");
    });
  });

  describe("bytesToGB", () => {
    it("should convert bytes to GB", () => {
      expect(bytesToGB(0)).toBe(0);
      expect(bytesToGB(1024 * 1024 * 1024)).toBe(1);
      expect(bytesToGB(5 * 1024 * 1024 * 1024)).toBe(5);
    });

    it("should handle decimals", () => {
      expect(bytesToGB(1.5 * 1024 * 1024 * 1024, 1)).toBe(1.5);
      expect(bytesToGB(2.5 * 1024 * 1024 * 1024, 2)).toBe(2.5);
    });
  });

  describe("bytesToMB", () => {
    it("should convert bytes to MB", () => {
      expect(bytesToMB(0)).toBe(0);
      expect(bytesToMB(1024 * 1024)).toBe(1);
      expect(bytesToMB(10 * 1024 * 1024)).toBe(10);
    });
  });

  describe("gbToBytes", () => {
    it("should convert GB to bytes", () => {
      expect(gbToBytes(0)).toBe(0);
      expect(gbToBytes(1)).toBe(1024 * 1024 * 1024);
      expect(gbToBytes(5)).toBe(5 * 1024 * 1024 * 1024);
    });
  });
});
