/**
 * localStorage utility helpers.
 * All reads and writes to localStorage go through these functions.
 */

/**
 * Get a value from localStorage.
 * Returns null if the key doesn't exist or on any error.
 */
function get(key) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Set a value in localStorage.
 * Serialises the value to JSON before storing.
 */
function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail (e.g. storage quota exceeded)
  }
}

/**
 * Remove a single key from localStorage.
 */
function clear(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

const LocalStorage = {
  get,
  set,
  clear,
};

export default LocalStorage;
