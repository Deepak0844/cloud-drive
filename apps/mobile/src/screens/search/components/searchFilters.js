// Server category enum (file.schema.js getFilesSchema).
export const FILE_CATEGORIES = [
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audio" },
  { key: "document", label: "Documents" },
  { key: "archive", label: "Archives" },
  { key: "other", label: "Other" },
];

// Quick date presets instead of a native calendar picker (no extra native dep).
export const DATE_PRESETS = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "year", label: "This year", days: null },
];

export function presetToRange(presetKey) {
  const now = new Date();
  if (presetKey === "year") {
    return { startDate: new Date(now.getFullYear(), 0, 1).toISOString(), endDate: now.toISOString() };
  }
  const preset = DATE_PRESETS.find((p) => p.key === presetKey);
  if (!preset?.days) return {};
  return {
    startDate: new Date(now.getTime() - preset.days * 864e5).toISOString(),
    endDate: now.toISOString(),
  };
}
