import React, { useState } from "react";
import { useUploadDetails } from "@contexts/UploadContext";
import UploadItem from "./UploadItem";
import { motion } from "framer-motion";
import { Typography } from "antd";
import Button from "@shared-components/components/button";
import { UpOutlined, DownOutlined, CloudUploadOutlined } from "@ant-design/icons";

const { Text } = Typography;

const UploadManager = () => {
  const { uploads } = useUploadDetails();
  const [minimized, setMinimized] = useState(false);

  if (uploads.length === 0) return null;

  const totalUploads = uploads.length;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        className="px-5 py-3.5 bg-gray-900 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setMinimized(!minimized)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setMinimized(!minimized);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <CloudUploadOutlined className="text-blue-400 text-xl" />
          <Text className="font-semibold text-white tracking-wide">
            {totalUploads} Upload{totalUploads !== 1 ? "s" : ""}
          </Text>
        </div>
        <Button
          type="text"
          icon={
            minimized ? (
              <UpOutlined className="text-gray-400 hover:text-white transition-colors" />
            ) : (
              <DownOutlined className="text-gray-400 hover:text-white transition-colors" />
            )
          }
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setMinimized(!minimized);
          }}
        />
      </div>

      {/* Upload Items List */}
      <motion.div
        initial={false}
        animate={{
          height: minimized ? 0 : "auto",
          opacity: minimized ? 0 : 1,
          pointerEvents: minimized ? "none" : "auto",
        }}
        className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-0 relative"
      >
        <div className="p-4 flex flex-col gap-0">
          {uploads.map((upload) => (
            <UploadItem key={upload.id} upload={upload} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default UploadManager;
