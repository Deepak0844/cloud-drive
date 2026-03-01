import {
  AppstoreOutlined,
  BarsOutlined,
  HistoryOutlined,
  SearchOutlined,
  FilterOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Input, Spin, Typography, Tooltip } from "antd";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";

// api
import { useGetRecentFilesQuery } from "../../store/api/fileApi";

// components
import FileItem from "@/components/files/FileItem";
import FolderItem from "@/components/files/FolderItem";
import InfoDrawer from "@/components/files/InfoDrawer";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import Button from "@shared-components/components/button";
import AdvancedFilterDropdown from "@/components/search/AdvancedFilterDropdown";
import useDebounce from "@/hooks/useDebounce";

const { Text } = Typography;

function RecentPage() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [infoItem, setInfoItem] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  // Search/Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [advancedFilters, setAdvancedFilters] = useState({});

  // API Queries
  const { data: recentData, isLoading } = useGetRecentFilesQuery({
    limit: 50,
    ...advancedFilters,
  });

  const allItems = recentData?.data || [];

  // Client-side search filtering (since backend current implementation is simple)
  // Actually, I should probably update backend to support search in recent too,
  // but for now, client-side is fine for a small "recent" list.
  const filteredItems = allItems.filter((item) => item.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const folders = filteredItems.filter((item) => item.type === "folder");
  const files = filteredItems.filter((item) => item.type === "file");

  function toggleSelect(id, type) {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      }
      return [...prev, { id, type }];
    });
  }

  const clearSelection = useCallback(() => setSelectedItems([]), []);

  const handleClickOutside = useCallback(
    (e) => {
      if (
        e.target.closest(".animate-item") ||
        e.target.closest(".bulk-actions-bar") ||
        e.target.closest(".ant-modal-root") ||
        e.target.closest(".ant-dropdown")
      )
        return;
      clearSelection();
    },
    [clearSelection]
  );

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Premium Header */}
      <div className="px-8 pt-8 pb-4 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <HistoryOutlined className="text-xl text-primary" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-label-primary m-0">Recent</h1>
            </div>
            <Breadcrumb
              className="mt-1"
              items={[
                { title: <span className="text-label-tertiary font-medium">My Files</span> },
                { title: <span className="text-label-primary font-bold">Recent</span> },
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Search recent..."
              prefix={<SearchOutlined className="text-label-tertiary" />}
              suffix={
                <AdvancedFilterDropdown
                  initialFilters={advancedFilters}
                  onFilter={(filters) => setAdvancedFilters(filters)}
                  onClear={() => setAdvancedFilters({})}
                  trigger={
                    <Tooltip title="Advanced Filters">
                      <div className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-alt cursor-pointer transition-all group/filter -mr-1">
                        <FilterOutlined
                          className={`text-xs ${Object.keys(advancedFilters).length > 0 ? "text-primary" : "text-label-tertiary"} group-hover/filter:text-primary`}
                        />
                      </div>
                    </Tooltip>
                  }
                />
              }
              className="premium-nav-search w-64 h-9 rounded-xl border-line bg-surface hover:bg-surface-alt focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />

            <div className="w-px h-4 bg-line mx-1" />

            <div className="flex items-center gap-1 bg-surface-dim p-1 rounded-xl border border-line">
              <Tooltip title="Grid View">
                <Button
                  styleType={viewMode === "grid" ? "primary" : "ghost"}
                  size="small"
                  className="w-8 h-8 p-0 flex items-center justify-center rounded-lg"
                  onClick={() => setViewMode("grid")}
                >
                  <AppstoreOutlined />
                </Button>
              </Tooltip>
              <Tooltip title="List View">
                <Button
                  styleType={viewMode === "list" ? "primary" : "ghost"}
                  size="small"
                  className="w-8 h-8 p-0 flex items-center justify-center rounded-lg"
                  onClick={() => setViewMode("list")}
                >
                  <BarsOutlined />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-32">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Spin size="large" />
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-96 grayscale opacity-60"
          >
            <div className="w-24 h-24 mb-6 bg-surface-dim rounded-full flex items-center justify-center border border-line">
              <HistoryOutlined className="text-4xl text-label-tertiary" />
            </div>
            <Text className="text-lg font-bold text-label-secondary">No recent items found</Text>
            <Text className="text-label-tertiary">Tasks you work on will appear here</Text>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8 py-4">
            {folders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-label-tertiary">
                    Recent Folders
                  </span>
                  <div className="h-px flex-1 bg-line/50" />
                </div>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                      : "flex flex-col gap-2"
                  }
                >
                  {folders.map((folder) => (
                    <FolderItem
                      key={folder._id}
                      folder={folder}
                      viewMode={viewMode}
                      isSelected={selectedItems.some((i) => i.id === folder._id)}
                      onToggleSelect={() => toggleSelect(folder._id, "folder")}
                      onShowInfo={() => setInfoItem({ ...folder, type: "folder" })}
                      // Recent items might not need full interaction, or they might. Let's keep it simple for now.
                    />
                  ))}
                </div>
              </section>
            )}

            {files.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-label-tertiary">
                    Recent Files
                  </span>
                  <div className="h-px flex-1 bg-line/50" />
                </div>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6"
                      : "flex flex-col gap-2"
                  }
                >
                  {files.map((file) => (
                    <FileItem
                      key={file._id}
                      file={file}
                      viewMode={viewMode}
                      isSelected={selectedItems.some((i) => i.id === file._id)}
                      onToggleSelect={() => toggleSelect(file._id, "file")}
                      onPreview={() => setPreviewFile(file)}
                      onShowInfo={() => setInfoItem({ ...file, type: "file" })}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {infoItem && <InfoDrawer item={infoItem} visible={!!infoItem} onClose={() => setInfoItem(null)} />}
      {previewFile && (
        <FilePreviewModal file={previewFile} visible={!!previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Simplified Bulk Actions Bar for Recent Page */}
      {selectedItems.length > 0 && (
        <div className="bulk-actions-bar rounded-[24px] p-2 pr-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] fixed bottom-8 left-1/2 -translate-x-1/2 z-100 bg-[#1a1c1e] border border-white/5 w-[90%] max-w-[400px]">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-black text-xs">{selectedItems.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[11px] font-black uppercase tracking-wider leading-none">
                Items Selected
              </span>
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-tight">Recent Management</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-[18px]">
            <Button
              ghost
              size="small"
              className="h-9 px-4 border-none text-white/90 hover:text-white hover:bg-white/10 font-bold text-xs flex items-center gap-2 rounded-xl"
              onClick={clearSelection}
            >
              <CloseOutlined />
              Deselect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecentPage;
