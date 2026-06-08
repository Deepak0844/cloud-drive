function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        continue; // strip MongoDB operator / dotted-path keys
      }
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }
  return value;
}

// Reassigning req.query is safe on Express 4.x; revisit on any Express 5 upgrade.
export default function sanitizeMongo(req, _res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
}
