import React from "react";
import { motion } from "framer-motion";
import { Breadcrumb, Spin } from "antd";
import { HomeOutlined, StarFilled } from "@ant-design/icons";
import { Link } from "react-router-dom";

// api
import { useGetFilesQuery } from "@/store/api/fileApi";
import { useGetFoldersQuery } from "@/store/api/folderApi";

// constants
import PageNames from "@/constants/pageNames";
import PageUrls from "@/constants/pageUrls";

// components
import FileItem from "@/components/files/FileItem";
import FolderItem from "@/components/files/FolderItem";

function FavoritesPage() {
  // Fetch favorite folders
  const { data: foldersData, isLoading: foldersLoading } = useGetFoldersQuery({ isFavorite: "true" });

  // Fetch favorite files
  const { data: filesData, isLoading: filesLoading } = useGetFilesQuery({ isFavorite: "true" });

  const folders = foldersData?.data || [];
  const files = filesData?.data || [];
  const isLoading = foldersLoading || filesLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0.5 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 pb-10"
    >
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-black text-label mb-2 tracking-tight flex items-center gap-3">
            <StarFilled className="text-warning" />
            {PageNames.FAVORITES}
          </h1>
          <Breadcrumb
            items={[
              {
                title: (
                  <Link to={PageUrls.DashboardPage} className="flex items-center gap-2 text-primary">
                    <HomeOutlined className="text-xs" /> <span>{PageNames.MY_FILES}</span>
                  </Link>
                ),
              },
              { title: PageNames.FAVORITES },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center w-full">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {folders.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-4 px-1 opacity-80">
                Favorite Folders
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <FolderItem
                    key={folder.id || folder._id}
                    folder={{ ...folder, id: folder.id || folder._id }}
                    viewMode="grid"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-4 px-1 opacity-80">
                Favorite Files
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {files.map((file) => (
                  <FileItem key={file.id || file._id} file={{ ...file, id: file.id || file._id }} viewMode="grid" />
                ))}
              </div>
            </div>
          )}

          {folders.length === 0 && files.length === 0 && (
            <div className="py-24 bg-surface rounded-3xl border border-line shadow-sm flex flex-col items-center justify-center text-center px-8">
              <div className="w-24 h-24 rounded-full bg-warning-light flex items-center justify-center mb-6">
                <StarFilled style={{ fontSize: "2.5rem", color: "var(--warning)" }} />
              </div>
              <h2 className="text-xl font-bold text-label mb-2">No favorites yet</h2>
              <p className="text-sm text-label-secondary max-w-xs leading-relaxed">
                Add stars to items you want to find easily. They will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default FavoritesPage;
