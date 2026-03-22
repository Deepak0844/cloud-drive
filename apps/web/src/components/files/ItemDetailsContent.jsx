// React core & third-party libraries
import React, { useState, useEffect } from "react";
import { Calendar, X, Image as ImageIcon, File, FileText, Folder, FolderOpen, Star, Tags } from "lucide-react";
import dayjs from "dayjs";

// Utils
import { formatBytes } from "@shared-utils/utils";
import { cn } from "@lib/utils";

// Services (RTK Query hooks)
import { useUpdateFileTagsMutation } from "@services/api/fileApi";
import { useUpdateFolderTagsMutation } from "@services/api/folderApi";

// Components
import { Separator } from "@components/ui/separator";
import { Badge } from "@components/ui/badge";
import { Input } from "@components/ui/input";

function getFileInfo(type, isFolder) {
  if (isFolder) {
    return { icon: <Folder size={32} />, color: "text-primary", bg: "bg-primary/10" };
  }
  switch (type) {
    case "image":
      return { icon: <ImageIcon size={32} />, color: "text-primary", bg: "bg-primary/10" };
    case "pdf":
      return { icon: <FileText size={32} />, color: "text-destructive", bg: "bg-destructive/10" };
    case "text":
      return { icon: <FileText size={32} />, color: "text-success", bg: "bg-success/10" };
    default:
      return { icon: <File size={32} />, color: "text-label-tertiary", bg: "bg-surface-alt" };
  }
}

export default function ItemDetailsContent({ item, className }) {
  // Local state
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (item?.tags) {
      setTags(item.tags);
    } else {
      setTags([]);
    }
  }, [item]);

  // RTK Query hooks
  const [updateFileTags, { isLoading: savingFileTags }] = useUpdateFileTagsMutation();
  const [updateFolderTags, { isLoading: savingFolderTags }] = useUpdateFolderTagsMutation();

  if (!item) return null;

  // Derived / computed variables
  const isFolder = "itemCount" in item || item.type === "Folder" || item.type === "FOLDER" || !item.extension;
  const fileType = isFolder ? "folder" : item.category || item.type || "file";
  const fileInfo = getFileInfo(fileType, isFolder);
  const id = item._id || item.id;
  const isSavingTags = savingFileTags || savingFolderTags;

  // Event handlers
  async function handleAddTag(e) {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      const updatedTags = [...tags, newTag.trim()];
      await saveTags(updatedTags);
      setNewTag("");
    }
  }

  async function handleRemoveTag(tagToRemove) {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    await saveTags(updatedTags);
  }

  async function saveTags(updatedTags) {
    setTags(updatedTags);
    try {
      if (isFolder) {
        await updateFolderTags({ id, tags: updatedTags }).unwrap();
      } else {
        await updateFileTags({ id, tags: updatedTags }).unwrap();
      }
    } catch (err) {
      console.error("Failed to update tags:", err);
    }
  }

  function TitleSection() {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-surface-dim/30 rounded-2xl mb-8 border border-white/5 shadow-inner">
        <div
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center shadow-glow-sm mb-4 transition-transform hover:scale-105",
            fileInfo.bg,
            fileInfo.color
          )}
        >
          {fileInfo.icon}
        </div>
        <h3 className="text-lg font-bold text-label mb-1 text-center truncate w-full px-4" title={item.name}>
          {item.name}
        </h3>
        <span className="uppercase tracking-widest text-[10px] font-black text-label-tertiary">
          {isFolder ? "Folder" : item.extension ? item.extension.replace(".", "") : fileType}
        </span>
      </div>
    );
  }

  function PropertiesTab() {
    let displayPath = "My Files";

    if (item.virtualPath) {
      displayPath = item.virtualPath;
    } else if (isFolder) {
      if (Array.isArray(item.path)) {
        displayPath = `My Files / ${item.path.map((p) => p.name).join(" / ")}`;
      } else if (typeof item.path === "string") {
        const cleanPath = item.path.replace(/^\/+/, "").replace(/\/+$/, "");
        displayPath = cleanPath ? `My Files / ${cleanPath}` : "My Files";
      }
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
              Size
            </span>
            <span className="text-sm font-bold text-label">
              {isFolder ? `${item.itemCount || 0} items` : formatBytes(item.size_bytes || item.size || 0)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
              Type
            </span>
            <Badge variant="secondary" className="rounded-md font-bold text-[10px] px-2 py-0 border-white/5">
              {isFolder
                ? "FOLDER"
                : item.extension
                  ? item.extension.replace(".", "").toUpperCase()
                  : fileType.toUpperCase()}
            </Badge>
          </div>
        </div>

        <Separator className="bg-white/5" />

        <div className="space-y-2">
          <span className="block text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
            Path
          </span>
          <div className="flex items-center gap-2 bg-surface-alt/50 p-3 rounded-xl border border-white/5 shadow-inner">
            <FolderOpen size={16} className="text-primary shrink-0" />
            <span className="text-xs break-all font-semibold text-label/90" title={displayPath}>
              {displayPath}
            </span>
          </div>
        </div>

        <Separator className="bg-white/5" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tags size={14} className="text-label-tertiary" />
            <span className="text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
              Tags
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 pr-1 group">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>

          <Input
            placeholder="Add tag and press Enter..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleAddTag}
            className="h-9 text-xs bg-surface-alt/30 border-white/5 focus-visible:ring-primary/20"
            disabled={isSavingTags}
          />
        </div>

        <Separator className="bg-white/5" />

        <div className="space-y-5">
          <div className="space-y-1.5">
            <span className="block text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
              Modified
            </span>
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-label-tertiary" />
              <span className="text-sm font-semibold text-label">
                {item.updatedAt ? dayjs(item.updatedAt).format("MMM D, YYYY h:mm A") : "Just now"}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
              Created
            </span>
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-label-tertiary" />
              <span className="text-sm font-semibold text-label">
                {item.createdAt ? dayjs(item.createdAt).format("MMM D, YYYY h:mm A") : "Unknown"}
              </span>
            </div>
          </div>
          {item.favorited_at && (
            <div className="space-y-1.5">
              <span className="block text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
                Favorited At
              </span>
              <div className="flex items-center gap-2.5">
                <Star size={14} className="text-warning fill-warning" />
                <span className="text-sm font-semibold text-label">
                  {dayjs(item.favorited_at).format("MMM D, YYYY h:mm A")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <TitleSection />
      <PropertiesTab />
    </div>
  );
}
