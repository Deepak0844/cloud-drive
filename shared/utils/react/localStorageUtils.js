function get(key) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail (e.g. storage quota exceeded)
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

function clear() {
  try {
    localStorage.clear();
  } catch {
    // Silently fail
  }
}

const LocalStorageUtils = {
  get,
  set,
  remove,
  clear,
};

export default LocalStorageUtils;
