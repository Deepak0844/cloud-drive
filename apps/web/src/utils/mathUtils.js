/**
 * Returns the percentage of `used` out of `total`, clamped to [0, 100].
 */
function calculatePercentage(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

const MathUtils = { calculatePercentage };

export default MathUtils;
