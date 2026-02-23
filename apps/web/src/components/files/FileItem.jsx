// external
import {
  CheckCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Card, Tooltip, Typography } from "antd";
import { motion } from "framer-motion";
import React from "react";

// components
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";

const { Text } = Typography;

function getFileInfo(type) {
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

function FileItem({ file, isSelected, onToggleSelect, onOpen, onShowInfo, onRename, onDelete, viewMode = "grid" }) {
  const clickTimeoutRef = React.useRef(null);

  function handleClick(e) {
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      onToggleSelect(file.id, e.metaKey || e.ctrlKey);
      clickTimeoutRef.current = null;
    }, 250);
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    onOpen?.(file);
  }

  const menuItems = [
    { key: "download", label: "Download", icon: <DownloadOutlined /> },
    { key: "info", label: "Details", icon: <InfoCircleOutlined />, onClick: () => onShowInfo?.(file) },
    { key: "rename", label: "Rename", icon: <EditOutlined />, onClick: () => onRename?.(file) },
    { type: "divider" },
    { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true, onClick: () => onDelete?.(file) },
  ];

  if (viewMode === "list") {
    return (
      <div
        className={`group flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer border ${
          isSelected
            ? "bg-primary-light border-primary/20"
            : "bg-surface hover:bg-surface-dim border-transparent hover:border-line"
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick(e);
        }}
        role="button"
        tabIndex={0}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(file.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleSelect(file.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-primary border-primary text-on-primary"
                : "border-line-strong bg-surface group-hover:border-primary"
            }`}
          >
            {isSelected && <CheckCircleFilled className="text-xs" />}
          </div>
        </div>

        <div
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xl ${getFileInfo(file.type).bg} ${getFileInfo(file.type).color}`}
        >
          {getFileInfo(file.type).icon}
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-6 font-medium text-sm text-label truncate">{file.name}</div>
          <div className="col-span-3 text-xs text-label-tertiary capitalize">{file.type}</div>
          <div className="col-span-3 text-xs text-label-tertiary">{file.size}</div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              className="text-label-tertiary hover:text-primary"
            />
          </Dropdown>
        </div>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -5 }} className="h-full relative">
      <Card
        hoverable
        className={`h-full border-2 rounded-2xl transition-all duration-200 relative ${
          isSelected
            ? "border-primary bg-primary-light shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
            : "border-transparent shadow-sm hover:shadow-xl bg-surface"
        }`}
        styles={{ body: { padding: "8px" } }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 z-20">
            <CheckCircleFilled className="text-primary text-lg bg-surface rounded-full" />
          </div>
        )}

        <div className="absolute top-2 left-2 z-10"></div>

        <div
          className={`aspect-square rounded-xl flex items-center justify-center mb-2 transition-colors duration-300 text-5xl ${
            isSelected ? "bg-surface" : getFileInfo(file.type).bg
          } ${getFileInfo(file.type).color}`}
        >
          {getFileInfo(file.type).icon}
        </div>

        <div className="flex items-start justify-between gap-1 px-1 pb-1">
          <div className="flex-1 min-w-0">
            <Tooltip title={file.name}>
              <Text strong className="block truncate text-[12px] leading-tight mb-0.5">
                {file.name}
              </Text>
            </Tooltip>
            <Text type="secondary" className="text-[10px] font-medium opacity-60">
              {file.size}
            </Text>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="button"
            tabIndex={0}
            className="mt-[-2px]"
          >
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <MoreOutlined className="text-label-tertiary hover:text-primary cursor-pointer p-1 rounded-full hover:bg-surface-alt transition-colors text-sm" />
            </Dropdown>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default FileItem;
