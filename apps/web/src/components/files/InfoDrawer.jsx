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
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Divider, Drawer, Tabs, Tag, Typography } from "antd";
import React from "react";

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

  const isFolder = "itemCount" in item;
  const fileInfo = getFileInfo(item.type, isFolder);

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
          {isFolder ? "Folder" : item.type}
        </Text>
      </div>
    );
  }

  function PropertiesTab() {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Size
            </Text>
            <Text strong className="text-sm">
              {isFolder ? `${item.itemCount} items` : item.size}
            </Text>
          </div>

          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Type
            </Text>
            <Tag className="m-0 rounded border-line-base bg-surface-dim">
              {isFolder ? "Folder" : item.type.toUpperCase()}
            </Tag>
          </div>
        </div>

        <Divider className="my-2 border-line-base" />

        <div>
          <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
            Path
          </Text>
          <div className="flex items-center gap-2 bg-surface-alt p-2 rounded-lg border border-line-base">
            <FolderOpenOutlined className="text-primary" />
            <Text className="text-sm truncate" title={item.path || "My Files"}>
              {item.path || "My Files"}
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
              <Text className="text-sm">{item.modifiedAt || "Just now"}</Text>
            </div>
          </div>
          <div>
            <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider mb-1">
              Created
            </Text>
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-label-tertiary" />
              <Text className="text-sm">{item.createdAt || "Jan 1, 2024"}</Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    {
      key: "details",
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <InfoCircleOutlined /> Details
        </span>
      ),
      children: <PropertiesTab />,
    },
  ];

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

      <Tabs defaultActiveKey="details" items={items} className="premium-tabs" tabBarStyle={{ marginBottom: 24 }} />
    </Drawer>
  );
}

export default InfoDrawer;
