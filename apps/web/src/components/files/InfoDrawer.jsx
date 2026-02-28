// external
import {
  CalendarOutlined,
  CloseOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderFilled,
  FolderOpenOutlined,
  StarFilled,
} from "@ant-design/icons";
import { Divider, Drawer, Tag, Typography } from "antd";
import React from "react";
import dayjs from "dayjs";

// shared utils
import { formatBytes } from "../../../../../shared/utils/src/format";

// components
import Button from "@shared-components/components/button";

const { Text, Title } = Typography;

function getFileInfo(type, isFolder) {
  if (isFolder) {
    return { icon: <FolderFilled />, color: "text-primary", bg: "bg-primary-light" };
  }
  switch (type) {
    case "image":
      return { icon: <FileImageOutlined />, color: "text-primary", bg: "bg-primary-light" };
    case "pdf":
      return { icon: <FilePdfOutlined />, color: "text-danger", bg: "bg-danger-light" };
    case "text":
      return { icon: <FileTextOutlined />, color: "text-success", bg: "bg-success-light" };
    default:
      return { icon: <FileOutlined />, color: "text-label-secondary", bg: "bg-surface-alt" };
  }
}

function InfoDrawer({ item, open, onClose }) {
  if (!item) return null;

  const isFolder = "itemCount" in item || item.type === "Folder" || item.type === "FOLDER" || !item.extension;
  const fileType = isFolder ? "folder" : item.category || item.type || "file";
  const fileInfo = getFileInfo(fileType, isFolder);

  function TitleSection() {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-surface-dim/30 rounded-2xl mb-6 border border-line-base">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-sm mb-4 transition-transform hover:scale-105 ${fileInfo.bg} ${fileInfo.color}`}
        >
          {fileInfo.icon}
        </div>
        <Title level={4} className="mb-1 text-center truncate w-full px-4" title={item.name}>
          {item.name}
        </Title>
        <Text type="secondary" className="uppercase tracking-wider text-[10px] font-bold">
          {isFolder ? "Folder" : item.extension ? item.extension.replace(".", "") : fileType}
        </Text>
      </div>
    );
  }

  function PropertiesTab() {
    // Format the path safely
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
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Size
            </Text>
            <Text strong className="text-sm">
              {isFolder ? `${item.itemCount || 0} items` : formatBytes(item.size_bytes || item.size || 0)}
            </Text>
          </div>

          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Type
            </Text>
            <Tag className="m-0 rounded border-line-base bg-surface-dim font-bold text-xs px-2">
              {isFolder
                ? "FOLDER"
                : item.extension
                  ? item.extension.replace(".", "").toUpperCase()
                  : fileType.toUpperCase()}
            </Tag>
          </div>
        </div>

        <Divider className="my-2 border-line-base" />

        <div>
          <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
            Path
          </Text>
          <div className="flex items-center gap-2 bg-surface-alt p-2.5 rounded-lg border border-line-base">
            <FolderOpenOutlined className="text-primary shrink-0" />
            <Text className="text-xs break-all font-medium" title={displayPath}>
              {displayPath}
            </Text>
          </div>
        </div>

        <Divider className="my-2 border-line-base" />

        <div className="space-y-4">
          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Modified
            </Text>
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-label-tertiary" />
              <Text className="text-sm font-medium">
                {item.updatedAt ? dayjs(item.updatedAt).format("MMM D, YYYY h:mm A") : "Just now"}
              </Text>
            </div>
          </div>
          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Created
            </Text>
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-label-tertiary" />
              <Text className="text-sm font-medium">
                {item.createdAt ? dayjs(item.createdAt).format("MMM D, YYYY h:mm A") : "Unknown"}
              </Text>
            </div>
          </div>
          {item.favorited_at && (
            <div>
              <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
                Favorited At
              </Text>
              <div className="flex items-center gap-2">
                <StarFilled className="text-warning" />
                <Text className="text-sm font-medium">{dayjs(item.favorited_at).format("MMM D, YYYY h:mm A")}</Text>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Drawer
      placement="right"
      onClose={onClose}
      open={open}
      closable={false}
      classNames={{
        body: "p-6",
        wrapper: "shadow-2xl",
      }}
      className="bg-surface/95 backdrop-blur-xl border-l border-white/20"
      styles={{
        wrapper: { backdropFilter: "blur(20px)", width: 360 },
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <Title level={5} className="m-0 text-label font-bold tracking-tight">
          Info
        </Title>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          className="hover:bg-surface-dim text-label-secondary transition-colors rounded-xl flex items-center justify-center w-8 h-8"
        />
      </div>

      <TitleSection />

      <PropertiesTab />
    </Drawer>
  );
}

export default InfoDrawer;
