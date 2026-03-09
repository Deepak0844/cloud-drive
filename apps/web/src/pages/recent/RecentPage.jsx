import {
  AppstoreOutlined,
  BarsOutlined,
  FilterOutlined,
  CloseOutlined,
  DownloadOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Typography, Tooltip, App } from "antd";
import SearchInput from "@shared-components/components/search-input";
import Loader from "@shared-components/components/loader";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteScroll } from "@shared-hooks/hooks";

// api
import { useGetRecentFilesQuery, useTouchFileMutation, useBulkDownloadMutation } from "@services/api/fileApi";

import { ItemTypes, QUERY_PARAMS_KEYS, DefaultPagination } from "@shared-constants/constants";

// components
import FileItem from "@components/files/FileItem";
import InfoDrawer from "@components/files/InfoDrawer";
import FilePreviewModal from "@components/files/FilePreviewModal";
import Button from "@shared-components/components/button";
import AdvancedFilterDropdown from "@components/search/AdvancedFilterDropdown";

const { Text } = Typography;

function RecentPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(() => {
    const p = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
    return p ? Number(p) : DefaultPagination.pageNumber;
  });

  const pageSize = useMemo(() => {
    const p = searchParams.get(QUERY_PARAMS_KEYS.PAGE_SIZE);
    return p ? Number(p) : DefaultPagination.pageSize || 30;
  }, [searchParams]);

  // Sync internal page state with URL
  useEffect(() => {
    const p = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
    const newPage = p ? Number(p) : DefaultPagination.pageNumber;
    if (newPage !== page) setPage(newPage);
  }, [searchParams, page]);

  // Derived State from URL
  const debouncedSearch = searchParams.get(QUERY_PARAMS_KEYS.SEARCH) || "";

  const advancedFilters = useMemo(() => {
    const filters = {};
    const cat = searchParams.get(QUERY_PARAMS_KEYS.CATEGORY);
    const sd = searchParams.get(QUERY_PARAMS_KEYS.START_DATE);
    const ed = searchParams.get(QUERY_PARAMS_KEYS.END_DATE);
    const min = searchParams.get(QUERY_PARAMS_KEYS.MIN_SIZE);
    const max = searchParams.get(QUERY_PARAMS_KEYS.MAX_SIZE);
    const tag = searchParams.get(QUERY_PARAMS_KEYS.TAG);

    if (cat) filters.category = cat;
    if (sd) filters.startDate = sd;
    if (ed) filters.endDate = ed;
    if (min) filters.minSize = Number(min);
    if (max) filters.maxSize = Number(max);
    if (tag) filters.tag = tag;
    return filters;
  }, [searchParams]);

  const updateParams = useCallback(
    (updates) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [previewFile, setPreviewFile] = useState(null);
  const [infoItem, setInfoItem] = useState(null);

  // Reset page when search/filters change
  useEffect(() => {
    // This is handled by updateParams normally, but if someone manually edits URL
    // or if we have other triggers, it's good to have.
    // However, the user wants to avoid hardcoding setPage(1).
  }, [debouncedSearch, advancedFilters]);

  // API Queries
  const {
    data: recentData,
    isLoading,
    isFetching,
  } = useGetRecentFilesQuery({
    pg: page,
    ps: pageSize,
    search: debouncedSearch || undefined,
    ...advancedFilters,
  });

  const paginationData = recentData?.pagination || {};

  const { loaderRef } = useInfiniteScroll({
    hasNext: paginationData?.hasNext || false,
    isLoading: isFetching,
    onLoadMore: () => {
      const nextPage = page + 1;
      setPage(nextPage);
      updateParams({ [QUERY_PARAMS_KEYS.PAGE_NO]: nextPage });
    },
  });

  const [touchFile] = useTouchFileMutation();
  const [bulkDownload, { isLoading: isDownloading }] = useBulkDownloadMutation();

  const allItems = recentData?.data || [];
  const filteredItems = allItems; // Filtering handled by backend now

  // Time grouping logic
  const groupItemsByTime = (items) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    items.forEach((item) => {
      const itemDate = new Date(item.last_opened_at || item.updatedAt);
      if (itemDate >= today) {
        groups.today.push(item);
      } else if (itemDate >= yesterday) {
        groups.yesterday.push(item);
      } else {
        groups.earlier.push(item);
      }
    });

    return groups;
  };

  const timeGroups = groupItemsByTime(filteredItems);

  function toggleSelect(id, type) {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      }
      return [...prev, { id, type }];
    });
  }

  async function handleBulkDownload() {
    if (selectedItems.length === 0) return;
    const fileItems = selectedItems.filter((i) => i.type === ItemTypes.FILE);
    if (fileItems.length === 0) {
      message.warning("Please select at least one file to download");
      return;
    }

    try {
      const result = await bulkDownload({ items: fileItems }).unwrap();
      const url = URL.createObjectURL(result);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "recent_download.zip";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      message.error("Failed to download files");
    }
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
            <SearchInput
              placeholder="Search recent..."
              className="h-10 w-64 md:w-80"
              suffix={
                <AdvancedFilterDropdown
                  initialFilters={advancedFilters}
                  onFilter={(filters) =>
                    updateParams({
                      [QUERY_PARAMS_KEYS.CATEGORY]: filters.category,
                      [QUERY_PARAMS_KEYS.START_DATE]: filters.startDate,
                      [QUERY_PARAMS_KEYS.END_DATE]: filters.endDate,
                      [QUERY_PARAMS_KEYS.MIN_SIZE]: filters.minSize,
                      [QUERY_PARAMS_KEYS.MAX_SIZE]: filters.maxSize,
                      [QUERY_PARAMS_KEYS.TAG]: filters.tag,
                      [QUERY_PARAMS_KEYS.PAGE_NO]: DefaultPagination.pageNumber,
                    })
                  }
                  onClear={() =>
                    updateParams({
                      [QUERY_PARAMS_KEYS.CATEGORY]: null,
                      [QUERY_PARAMS_KEYS.START_DATE]: null,
                      [QUERY_PARAMS_KEYS.END_DATE]: null,
                      [QUERY_PARAMS_KEYS.MIN_SIZE]: null,
                      [QUERY_PARAMS_KEYS.MAX_SIZE]: null,
                      [QUERY_PARAMS_KEYS.TAG]: null,
                      [QUERY_PARAMS_KEYS.PAGE_NO]: DefaultPagination.pageNumber,
                    })
                  }
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
            <Loader size={32} />
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
          <div className="flex flex-col gap-12 py-4">
            {Object.entries(timeGroups).map(
              ([key, items]) =>
                items.length > 0 && (
                  <section key={key}>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary">
                        {key === "today" ? "Today" : key === "yesterday" ? "Yesterday" : "Earlier"}
                      </span>
                      <div className="h-px flex-1 bg-linear-to-r from-line/50 to-transparent" />
                    </div>
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6"
                          : "flex flex-col gap-2"
                      }
                    >
                      {items.map((file) => {
                        const id = String(file._id || file.id);
                        return (
                          <FileItem
                            key={id}
                            file={{ ...file, id }}
                            viewMode={viewMode}
                            isSelected={selectedItems.some((i) => String(i.id) === id)}
                            onToggleSelect={() => toggleSelect(id, "file")}
                            onOpen={() => {
                              setPreviewFile(file);
                              touchFile({ id });
                            }}
                            onShowInfo={() => setInfoItem({ ...file, id, type: "file" })}
                            showParentContext={true}
                          />
                        );
                      })}
                    </div>
                  </section>
                )
            )}

            {/* Infinite Scroll Loader */}
            <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4 w-full">
              {isFetching ? (
                <>
                  <Loader size={24} />
                  <Text className="text-label-tertiary text-sm">Loading more items...</Text>
                </>
              ) : paginationData?.hasNext ? (
                <Text className="text-label-tertiary text-sm italic">Scroll for more</Text>
              ) : (
                <Text className="text-label-tertiary text-sm italic">No more items</Text>
              )}
            </div>
          </div>
        )}
      </div>

      {infoItem && <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />}
      {previewFile && <FilePreviewModal file={previewFile} open={!!previewFile} onClose={() => setPreviewFile(null)} />}

      {/* Simplified Bulk Actions Bar for Recent Page */}
      {selectedItems.length > 0 && (
        <div className="bulk-actions-bar rounded-[24px] p-2 pr-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] fixed bottom-10 left-1/2 -translate-x-1/2 z-1000 bg-[#1a1c1e] border border-white/10 w-[95%] max-w-[500px]">
          <div className="flex items-center gap-3 ml-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-black text-xs">{selectedItems.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[11px] font-black uppercase tracking-wider leading-none">
                Items Selected
              </span>
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-tight">Recent Page</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-[20px] ml-4 overflow-hidden flex-nowrap">
            <Button
              type="text"
              size="small"
              className="h-9 px-4 border-none text-white/90 hover:text-white hover:bg-white/10 font-bold text-xs flex items-center gap-2 rounded-xl"
              onClick={clearSelection}
            >
              <CloseOutlined />
              Deselect
            </Button>
            <div className="w-px h-4 bg-white/10" />
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              loading={isDownloading}
              className="h-9 px-4 border-none text-primary hover:text-primary-light hover:bg-white/10 font-bold text-xs flex items-center gap-2 rounded-xl"
              onClick={handleBulkDownload}
            >
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecentPage;
