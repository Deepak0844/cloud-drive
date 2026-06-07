import React from "react";
import { File as FileIcon, FileArchive, FileAudio, FileImage, FileText, FileVideo } from "lucide-react";

export function getFileIcon(fileType) {
  if (!fileType) return <FileIcon className="text-label-tertiary" />;
  if (fileType.startsWith("image/")) return <FileImage className="text-blue-500" />;
  if (fileType === "application/pdf") return <FileText className="text-red-500" />;
  if (fileType.startsWith("text/")) return <FileText className="text-green-500" />;
  if (fileType.startsWith("video/")) return <FileVideo className="text-purple-500" />;
  if (fileType.startsWith("audio/")) return <FileAudio className="text-pink-500" />;
  if (fileType.includes("zip") || fileType.includes("compressed") || fileType.includes("tar"))
    return <FileArchive className="text-orange-500" />;
  return <FileIcon className="text-label-tertiary" />;
}

export function formatSpeed(bps) {
  if (!bps || bps <= 0) return null;
  if (bps >= 1000 * 1000) return `${(bps / 1000 / 1000).toFixed(1)} MB/s`;
  if (bps >= 1000) return `${(bps / 1000).toFixed(0)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

export function formatEta(seconds) {
  if (!seconds || seconds <= 0) return null;
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `~${m} min${s > 0 ? ` ${s} s` : ""}`;
  }
  return `~${seconds} s`;
}
