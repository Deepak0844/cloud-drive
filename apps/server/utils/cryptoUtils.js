import crypto from "crypto";
import fs from "fs";
import Env from "#config/env.js";
import logger from "#utils/logger.js";

// Hardware-accelerated symmetric encryption mode
const ALGORITHM = "aes-256-ctr";
const WRAP_ALGORITHM = "aes-256-gcm"; // Authenticated encryption for the KEK->DEK mapping
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Parses the Master Key (KEK) from environment variables safely.
 * Must be 32 bytes (64 hex chars).
 */
function getMasterKey() {
  const key = Env.STORAGE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("Invalid STORAGE_ENCRYPTION_KEY. Must be 32 bytes (64 hex characters).");
  }
  return Buffer.from(key, "hex");
}

/**
 * Generate a new random 32-byte Data Encryption Key (DEK) for a user,
 * and securely wrap it using the server's Master Key (KEK).
 *
 * @returns {object} { plaintextKey: Buffer, wrappedKey: string }
 */
function generateAndWrapUserKey() {
  const plaintextKey = crypto.randomBytes(KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(WRAP_ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plaintextKey, null, "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedKey
  const wrappedKey = `${iv.toString("hex")}:${authTag}:${encrypted}`;

  return {
    plaintextKey,
    wrappedKey,
  };
}

/**
 * Unwrap a user's wrapped DEK using the server's Master Key (KEK).
 *
 * @param {string} wrappedKey - The wrapped key string stored in the User DB record
 * @returns {Buffer} The 32-byte plaintext User Key
 */
function unwrapUserKey(wrappedKey) {
  if (!wrappedKey) {
    throw new Error("No wrapped key provided");
  }

  const parts = wrappedKey.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid wrapped key format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedKey = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(WRAP_ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);

  let plaintextKey;
  try {
    plaintextKey = decipher.update(encryptedKey);
    plaintextKey = Buffer.concat([plaintextKey, decipher.final()]);
  } catch (_err) {
    logger.error("[CryptoUtils] Failed to unwrap user key (Master Key might have changed or data corrupted)");
    throw new Error("Decryption failed");
  }

  return plaintextKey;
}

/**
 * Re-wrap a user's DEK from the current KEK to a new KEK.
 * Used during master-key rotation — call unwrapUserKey (current KEK via Env),
 * then re-encrypt the plaintext DEK with the provided newKek buffer.
 *
 * @param {string} wrappedKey - Existing wrapped key string from the User record
 * @param {Buffer} newKek - The new 32-byte master key to wrap under
 * @returns {string} New wrapped key string in "iv:authTag:encryptedKey" format
 */
function rewrapUserKey(wrappedKey, newKek) {
  const plaintextKey = unwrapUserKey(wrappedKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(WRAP_ALGORITHM, newKek, iv);
  let encrypted = cipher.update(plaintextKey, null, "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Generate a random 16-byte Initialization Vector for a single file.
 * @returns {Buffer}
 */
function generateFileIv() {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Returns a cipher stream for encrypting a file.
 * @param {Buffer} userKey - The unwrapped plaintext user key (32 bytes)
 * @param {Buffer} iv - The random 16-byte IV for the file
 * @returns {crypto.Cipher}
 */
function getCipherStream(userKey, iv) {
  return crypto.createCipheriv(ALGORITHM, userKey, iv);
}

/**
 * Returns a decipher stream for decrypting a file from the beginning.
 * @param {Buffer} userKey - The unwrapped plaintext user key (32 bytes)
 * @param {Buffer} iv - The 16-byte IV for the file
 * @returns {crypto.Decipher}
 */
function getDecipherStream(userKey, iv) {
  return crypto.createDecipheriv(ALGORITHM, userKey, iv);
}

/**
 * O(1) Random Access Decryption logic for AES-256-CTR.
 * Calculates the exact state of the counter for a given byte offset,
 * and returns an initialized decipher ready to stream from that offset.
 *
 * This is critical for HTTP Range requests (video streaming).
 *
 * @param {Buffer} userKey - The unwrapped plaintext user key (32 bytes)
 * @param {Buffer} iv - The 16-byte IV originally used for the file
 * @param {number} startOffset - The byte offset requested by the client (e.g. 1048576 for 1MB)
 * @returns {crypto.Decipher}
 */
function getDecipherForRange(userKey, iv, startOffset) {
  // CTR operates on 16-byte blocks
  const BLOCK_SIZE = 16;

  // Calculate which 16-byte block the start offset falls into
  const blockIndex = Math.floor(startOffset / BLOCK_SIZE);

  // The exact byte inside that block where our stream actually starts
  const byteOffsetInBlock = startOffset % BLOCK_SIZE;

  // The CTR mode IV acts as the initial counter.
  // We need to advance the 128-bit integer by 'blockIndex' iterations.

  // Convert 16-byte buffer IV to BigInt
  let counterBigInt = 0n;
  const ivBuffer = Buffer.isBuffer(iv) ? iv : Buffer.from(iv, "hex");
  for (let i = 0; i < 16; i++) {
    // Read big-endian
    counterBigInt = (counterBigInt << 8n) | BigInt(ivBuffer[i]);
  }

  // Advance the counter
  counterBigInt += BigInt(blockIndex);

  // Convert back to 16-byte buffer IV
  const advancedIv = Buffer.alloc(16);
  for (let i = 15; i >= 0; i--) {
    advancedIv[i] = Number(counterBigInt & 0xffn);
    counterBigInt >>= 8n;
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, userKey, advancedIv);

  // If the offset isn't perfectly aligned to a 16-byte block boundary,
  // we must "burn" the first few bytes of the keystream for this specific block
  // so that the stream perfectly aligns with the remaining bytes requested.
  if (byteOffsetInBlock > 0) {
    // Generate 'byteOffsetInBlock' bytes of keystream and discard them
    const dummyBuffer = Buffer.alloc(byteOffsetInBlock, 0);
    decipher.update(dummyBuffer);
  }

  return decipher;
}

/**
 * Computes HMAC-SHA256 over the ciphertext bytes of a stored file.
 * Keyed with the user's plaintext DEK so integrity is user-scoped.
 *
 * @param {Buffer} userKey - Unwrapped plaintext DEK (32 bytes)
 * @param {string} filePath - Absolute path to the encrypted file on disk
 * @returns {Promise<string>} Hex-encoded HMAC digest
 */
function computeFileHmac(userKey, filePath) {
  return new Promise((resolve, reject) => {
    const hmac = crypto.createHmac("sha256", userKey);
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hmac.update(chunk));
    stream.on("end", () => resolve(hmac.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Verifies a stored HMAC against the current ciphertext on disk.
 * Uses timingSafeEqual to prevent timing-oracle attacks.
 *
 * @param {Buffer} userKey - Unwrapped plaintext DEK (32 bytes)
 * @param {string} filePath - Absolute path to the encrypted file on disk
 * @param {string} storedHmac - Hex-encoded HMAC previously written to the DB
 * @returns {Promise<boolean>} true if integrity holds, false if tampered
 */
async function verifyFileHmac(userKey, filePath, storedHmac) {
  const computed = await computeFileHmac(userKey, filePath);
  const storedBuf = Buffer.from(storedHmac, "hex");
  const computedBuf = Buffer.from(computed, "hex");
  if (storedBuf.length !== computedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(storedBuf, computedBuf);
}

const CryptoUtils = {
  generateAndWrapUserKey,
  unwrapUserKey,
  rewrapUserKey,
  generateFileIv,
  getCipherStream,
  getDecipherStream,
  getDecipherForRange,
  computeFileHmac,
  verifyFileHmac,
};

export default CryptoUtils;
