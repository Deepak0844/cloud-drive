import { UAParser } from "ua-parser-js";

/**
 * Extracts and formats device and network information from an Express request object.
 * @param {Object} req - Express request
 * @returns {Object} { ip, device, timestamp }
 */
export function getSessionMetadata(req) {
  const ua = req.headers["user-agent"];
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const browser = result.browser.name ? `${result.browser.name} ${result.browser.version || ""}` : "Unknown Browser";
  const os = result.os.name ? `${result.os.name} ${result.os.version || ""}` : "Unknown OS";
  const deviceType = result.device.model ? ` (${result.device.model})` : "";

  // Get IP (handles proxies if trust proxy is enabled)
  const ip = req.ip || req.connection.remoteAddress || "Unknown IP";

  return {
    ip,
    device: `${browser} on ${os}${deviceType}`,
    timestamp:
      new Date().toLocaleString("en-US", {
        timeZone: "UTC",
        dateStyle: "long",
        timeStyle: "medium",
      }) + " UTC",
  };
}

const SecurityUtils = {
  getSessionMetadata,
};

export default SecurityUtils;
