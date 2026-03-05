// Set / Add in LocalStorage
function set(key, val) {
  localStorage.setItem(key, val);
}

// Get from LocalStorage
function get(key) {
  return localStorage.getItem(key);
}

// Remove from LocalStorage
function remove(key) {
  localStorage.removeItem(key);
}

// Clear LocalStorage
function clear() {
  localStorage.clear();
}

const LocalStorageUtils = {
  set,
  get,
  remove,
  clear,
};

export default LocalStorageUtils;
