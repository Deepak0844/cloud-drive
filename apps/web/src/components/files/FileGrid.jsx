// React core & third-party libraries
import React from "react";
import { CloudUpload, Folder } from "lucide-react";
import { cn } from "@lib/utils";

// Constants
import { ItemTypes } from "@shared-constants/constants";

// Components
import FileItem from "@components/files/FileItem";
import FolderItem from "@components/files/FolderItem";
import Loader from "@components/common/Loader";

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
  handleDownload,
  handleToggleFileFavorite = () => {},
  handleToggleFolderFavorite = () => {},
  isFileFavoriting = false,
  isFolderFavoriting = false,
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
              className={cn(
                "transition-all duration-300",
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-2"
              )}
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
                      onToggleFavorite={handleToggleFolderFavorite}
                      isFavoriting={isFolderFavoriting}
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
              className={cn(
                "transition-all duration-300",
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  : "flex flex-col gap-2"
              )}
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
                      handleDownload={handleDownload}
                      onToggleFavorite={handleToggleFileFavorite}
                      isFavoriting={isFileFavoriting}
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
                <span className="text-label-tertiary text-sm font-medium">Loading more files...</span>
              </>
            ) : paginationData?.hasNext ? (
              <span className="text-label-tertiary text-sm italic opacity-60">Scroll for more</span>
            ) : (
              <span className="text-label-tertiary text-sm italic opacity-60">No more files</span>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isContentsLoading && folders.length === 0 && files.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center w-full">
          <div className="w-24 h-24 mb-6 rounded-3xl bg-surface-alt flex items-center justify-center border-2 border-dashed border-white/10 group">
            <Folder className="size-10 text-label-tertiary group-hover:text-primary transition-colors" />
          </div>
          <h3 className="text-xl font-black text-label mb-2 tracking-tight">This folder is empty</h3>
          <p className="text-label-secondary font-medium max-w-xs leading-relaxed opacity-70">
            Drag and drop files here to upload, or use the &quot;New&quot; button to get started.
          </p>
        </div>
      )}

      {/* Premium Drop Hint Overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-40 transition-all duration-500 backdrop-blur-xl bg-primary/5 flex items-center justify-center p-8 rounded-3xl overflow-hidden",
          isDragging ? "opacity-100" : "opacity-0 invisible"
        )}
      >
        <div
          className={cn(
            "relative w-full max-w-md bg-surface/90 backdrop-blur-2xl p-12 rounded-[2.5rem] shadow-premium border border-white/20 flex flex-col items-center gap-6 transition-all duration-500",
            isDragging ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          )}
        >
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-2 animate-pulse">
            <CloudUpload size={48} className="text-primary stroke-[2.5]" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black text-label tracking-tighter">Ready to Upload</h3>
            <p className="text-label-secondary font-bold px-6 leading-relaxed opacity-80">
              Drop your files here to instantly add them to your secure cloud storage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
