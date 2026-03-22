import React from "react";
import { Image, FileText, FileAudio, FileVideo, FileCode, FileArchive, File as FileIcon } from "lucide-react";

export function getFileInfo(type) {
  switch (type) {
    case "image":
      return { icon: <Image size={24} />, color: "text-chart-1", bg: "bg-chart-1/10" };
    case "video":
      return { icon: <FileVideo size={24} />, color: "text-chart-2", bg: "bg-chart-2/10" };
    case "audio":
      return { icon: <FileAudio size={24} />, color: "text-chart-3", bg: "bg-chart-3/10" };
    case "pdf":
    case "text":
      return { icon: <FileText size={24} />, color: "text-chart-4", bg: "bg-chart-4/10" };
    case "archive":
      return { icon: <FileArchive size={24} />, color: "text-chart-5", bg: "bg-chart-5/10" };
    case "code":
      return { icon: <FileCode size={24} />, color: "text-info", bg: "bg-info/10" };
    default:
      return { icon: <FileIcon size={24} />, color: "text-muted-foreground", bg: "bg-surface-alt" };
  }
}

const FileDisplayUtils = { getFileInfo };
export default FileDisplayUtils;
