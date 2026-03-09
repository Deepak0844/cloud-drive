// React core & third-party libraries
import React from "react";
import { Typography } from "antd";
import { CloudUploadOutlined, FolderFilled } from "@ant-design/icons";

// Constants
import { ItemTypes } from "@shared-constants/constants";

// Components
import FileItem from "@components/files/FileItem";
import FolderItem from "@components/files/FolderItem";
import Loader from "@shared-components/components/loader";

const { Text } = Typography;

export default function FileGrid({
  folders,
  files,
  isContentsLoading,
  isContentsFetching,
  paginationData,
  loaderRef,
  viewMode,
  selectedItems,
  toggleSelect,
  handleOpen,
  handleShowInfo,
  handleRenameTrigger,
  handleDeleteTrigger,
  handleMoveTrigger,
  handleCopyTrigger,
  isDragging,
}) {
  // Render
  return (
    <div className="space-y-6 text-left relative">
      {/* Folders Section */}
      {(folders.length > 0 || isContentsLoading) && (
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
            Folders
          </h2>
          {isContentsLoading ? (
            <div className="py-10 flex justify-center w-full">
              <Loader size={32} />
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-2"
              }
            >
              {folders.map((folder) => {
                const id = String(folder._id || folder.id);
                return (
                  <div key={id}>
                    <FolderItem
                      folder={{ ...folder, id }}
                      viewMode={viewMode}
                      isSelected={selectedItems.some((i) => String(i.id) === id)}
                      onToggleSelect={(id) => toggleSelect(String(id), ItemTypes.FOLDER)}
                      onOpen={handleOpen}
                      onShowInfo={handleShowInfo}
                      onRename={handleRenameTrigger}
                      onDelete={handleDeleteTrigger}
                      onMove={handleMoveTrigger}
                      onCopy={handleCopyTrigger}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Files Section */}
      {(files.length > 0 || isContentsLoading) && (
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
            Files
          </h2>
          {isContentsLoading ? (
            <div className="py-10 flex justify-center w-full">
              <Loader size={32} />
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  : "flex flex-col gap-2"
              }
            >
              {files.map((file) => {
                const id = String(file._id || file.id);
                return (
                  <div key={id}>
                    <FileItem
                      file={{ ...file, id }}
                      viewMode={viewMode}
                      isSelected={selectedItems.some((i) => String(i.id) === id)}
                      onToggleSelect={(id) => toggleSelect(String(id), ItemTypes.FILE)}
                      onOpen={handleOpen}
                      onShowInfo={handleShowInfo}
                      onRename={handleRenameTrigger}
                      onDelete={handleDeleteTrigger}
                      onMove={handleMoveTrigger}
                      onCopy={handleCopyTrigger}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4 w-full">
            {isContentsFetching ? (
              <>
                <Loader size={24} />
                <Text className="text-label-tertiary text-sm">Loading more files...</Text>
              </>
            ) : paginationData?.hasNext ? (
              <Text className="text-label-tertiary text-sm italic">Scroll for more</Text>
            ) : (
              <Text className="text-label-tertiary text-sm italic">No more files</Text>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isContentsLoading && folders.length === 0 && files.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center w-full opacity-60">
          <div className="w-24 h-24 mb-6 rounded-full bg-surface-dim flex items-center justify-center border-4 border-dashed border-line">
            <FolderFilled className="text-4xl text-label-tertiary" />
          </div>
          <Text className="text-xl font-bold text-label mb-2">This folder is empty</Text>
          <Text className="text-label-secondary block max-w-sm">
            Drag and drop files here to upload, or use the &quot;New&quot; button to create folders and add files.
          </Text>
        </div>
      )}

      {/* Premium Drop Hint Overlay */}
      <div
        className={`pointer-events-none absolute inset-0 z-40 transition-all duration-300 backdrop-blur-md bg-white/40 flex items-center justify-center p-8 rounded-2xl overflow-hidden ${isDragging ? "opacity-100" : "opacity-0 invisible"}`}
      >
        <div
          className={`relative w-full max-w-md bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 flex flex-col items-center gap-6 transition-all duration-300 ${isDragging ? "scale-100" : "scale-95"}`}
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <CloudUploadOutlined className="text-6xl text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-label tracking-tight">Ready to Upload</h3>
            <p className="text-label-secondary font-medium px-4">
              Drop your files here to instantly add them to your NAS storage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
