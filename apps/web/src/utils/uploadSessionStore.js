/**
 * uploadSessionStore.js
 *
 * Thin localStorage wrapper for persisting chunked-upload sessions.
 * A session is keyed by a file fingerprint so an interrupted upload can
 * be resumed after a page reload without re-sending already-received chunks.
 *
 * Lifecycle:
 *   1. After initChunkedUpload succeeds          → saveUploadSession()
 *   2. When client needs to resume               → loadUploadSession()
 *   3. After successful finalize OR explicit cancel → clearUploadSession()
 *   4. On pause (temporary interruption)         → session is intentionally kept
 *
 * Matches the server-side TEMP_UPLOAD_EXPIRY_HOURS default of 24 h, so an
 * entry that outlives its server-side chunk dir is automatically purged on
 * the next load attempt.
 */

const SESSION_KEY_PREFIX = "cd_upload_";

// 24 h — mirrors server TEMP_UPLOAD_EXPIRY_HOURS default
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

/**
 * Derive a stable, cross-session fingerprint for a File object.
 * name + size + lastModified uniquely identifies the same local file.
 * lastModified is 0 for programmatically created Files — acceptable since
 * those are unlikely to trigger resume scenarios in practice.
 *
 * @param {File} file
 * @returns {string}
 */
export function getFileFingerprint(file) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function storageKey(fingerprint) {
  return `${SESSION_KEY_PREFIX}${fingerprint}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist an upload session so it can be resumed after a page reload.
 * Safe to call multiple times — overwrites the previous entry.
 *
 * @param {string} fingerprint  Value returned by getFileFingerprint()
 * @param {{ uploadId: string, totalChunks: number, fileName: string, fileSize: number, folderId: string|null }} data
 */
export function saveUploadSession(fingerprint, data) {
  try {
    localStorage.setItem(storageKey(fingerprint), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // Silently swallow — private mode or localStorage quota exceeded
  }
}

/**
 * Load a previously saved session.
 * Returns null if the entry does not exist, cannot be parsed, or has expired.
 *
 * @param {string} fingerprint
 * @returns {{ uploadId: string, totalChunks: number, fileName: string, fileSize: number, folderId: string|null, savedAt: number }|null}
 */
export function loadUploadSession(fingerprint) {
  try {
    const raw = localStorage.getItem(storageKey(fingerprint));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // Purge expired entries on read
    if (Date.now() - (parsed.savedAt ?? 0) > SESSION_TTL_MS) {
      clearUploadSession(fingerprint);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Remove a persisted session.
 * Call this after a successful finalize or an intentional cancel.
 * Do NOT call on pause — the session must survive to enable resume.
 *
 * @param {string} fingerprint
 */
export function clearUploadSession(fingerprint) {
  try {
    localStorage.removeItem(storageKey(fingerprint));
  } catch {
    // noop
  }
}

const UploadSessionStore = { getFileFingerprint, saveUploadSession, loadUploadSession, clearUploadSession };
export default UploadSessionStore;
