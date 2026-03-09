import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  DeleteOutlined,
  FilterOutlined,
  HomeOutlined,
  RestOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { App, Breadcrumb, Tooltip } from "antd";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

// api
import {
  useEmptyTrashMutation,
  useGetTrashItemsQuery,
  usePermanentlyDeleteItemsMutation,
  useRestoreItemsMutation,
} from "@services/api/trashApi";

// constants
import { ItemTypes, QUERY_PARAMS_KEYS, DefaultPagination } from "@shared-constants/constants";
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";

// hooks
import { useInfiniteScroll } from "@shared-hooks/hooks";

// components
import FileItem from "@components/files/FileItem";
import FolderItem from "@components/files/FolderItem";
import InfoDrawer from "@components/files/InfoDrawer";
import AdvancedFilterDropdown from "@components/search/AdvancedFilterDropdown";
import Button from "@shared-components/components/button";
import SearchInput from "@shared-components/components/search-input";
import Loader from "@shared-components/components/loader";

function TrashView() {
  const { message, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(() => {
    const p = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
    return p ? Number(p) : DefaultPagination.pageNumber;
  });

  const pageSize = useMemo(() => {
    const p = searchParams.get(QUERY_PARAMS_KEYS.PAGE_SIZE);
    return p ? Number(p) : DefaultPagination.pageSize;
  }, [searchParams]);

  // Sync internal page state with URL
  useEffect(() => {
    const p = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
    const newPage = p ? Number(p) : DefaultPagination.pageNumber;
    if (newPage !== page) setPage(newPage);
  }, [searchParams, page]);

  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [infoItem, setInfoItem] = useState(null);

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

  // Reset page relative to search/filters
  useEffect(() => {
    // Handled by updateParams, but good for external URL changes
  }, [debouncedSearch, advancedFilters]);

  // API Queries
  const {
    data: trashData,
    isLoading,
    isFetching,
  } = useGetTrashItemsQuery({
    search: debouncedSearch || undefined,
    pg: page,
    ps: pageSize,
    ...advancedFilters,
  });

  const paginationData = trashData?.pagination || {};

  const { loaderRef } = useInfiniteScroll({
    hasNext: paginationData?.hasNext || false,
    isLoading: isFetching,
    onLoadMore: () => {
      const nextPage = page + 1;
      setPage(nextPage);
      updateParams({ [QUERY_PARAMS_KEYS.PAGE_NO]: nextPage });
    },
  });

  // API Mutations
  const [emptyTrash, { isLoading: isEmptying }] = useEmptyTrashMutation();
  const [restoreItems, { isLoading: isRestoring }] = useRestoreItemsMutation();
  const [permanentlyDeleteItems, { isLoading: isDeleting }] = usePermanentlyDeleteItemsMutation();

  const folders = trashData?.data?.folders || [];
  const files = trashData?.data?.files || [];

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

  const handleEmptyTrash = () => {
    modal.confirm({
      title: "Empty Trash",
      icon: <RestOutlined className="text-danger" />,
      content: "Are you sure you want to permanently delete all items in the trash? This action cannot be undone.",
      okText: "Empty Trash",
      okType: "danger",
      cancelText: "Cancel",
      className: "premium-modal",
      centered: true,
      onOk: async () => {
        try {
          await emptyTrash().unwrap();
          message.success("Trash emptied successfully");
          clearSelection();
        } catch (_error) {
          message.error("Failed to empty trash");
        }
      },
    });
  };

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) return;
    try {
      await restoreItems({ items: selectedItems }).unwrap();
      message.success(`Restored ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      message.error("Failed to restore items");
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    modal.confirm({
      title: "Delete Forever",
      icon: <DeleteOutlined className="text-danger" />,
      content: `Are you sure you want to permanently delete these ${selectedItems.length} items? This action cannot be undone.`,
      okText: "Delete Forever",
      okType: "danger",
      cancelText: "Cancel",
      className: "premium-modal",
      centered: true,
      onOk: async () => {
        try {
          await permanentlyDeleteItems({ items: selectedItems }).unwrap();
          message.success(`Permanently deleted ${selectedItems.length} items`);
          clearSelection();
        } catch (_error) {
          message.error("Failed to delete items");
        }
      },
    });
  };

  const isSelected = (id) => selectedItems.some((item) => item.id === id);

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Redesigned Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold text-label mb-2 flex items-center gap-3">
            <RestOutlined className="text-danger opacity-80" />
            {PageNames.TRASH}
          </h1>
          <Breadcrumb
            items={[
              {
                title: (
                  <Link
                    to={PageUrls.DashboardPage}
                    className="flex items-center gap-2 text-primary font-semibold text-xs transition-colors"
                  >
                    <HomeOutlined className="text-[10px]" /> <span>{PageNames.MY_FILES}</span>
                  </Link>
                ),
              },
              { title: <span className="text-label-secondary font-medium text-xs">{PageNames.TRASH}</span> },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <SearchInput
            placeholder="Search in trash..."
            className="w-full md:w-64 h-10"
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

          <div className="flex items-center gap-2 bg-surface-alt p-1 rounded-xl shrink-0">
            {/* View Mode Toggles */}
            <div className="flex items-center gap-1">
              <Button
                type={viewMode === "grid" ? "default" : "text"}
                size="small"
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("grid")}
                className={`rounded-lg w-8 h-8 flex items-center justify-center border-none ${
                  viewMode === "grid"
                    ? "bg-surface shadow-sm text-primary"
                    : "text-label-secondary hover:bg-surface-alt"
                }`}
              />
              <Button
                type={viewMode === "list" ? "default" : "text"}
                size="small"
                icon={<BarsOutlined />}
                onClick={() => setViewMode("list")}
                className={`rounded-lg w-8 h-8 flex items-center justify-center border-none ${
                  viewMode === "list"
                    ? "bg-surface shadow-sm text-primary"
                    : "text-label-secondary hover:bg-surface-alt"
                }`}
              />
            </div>
          </div>

          <Button
            danger
            type="primary"
            icon={<RestOutlined />}
            onClick={handleEmptyTrash}
            disabled={folders.length === 0 && files.length === 0}
            loading={isEmptying}
            className="rounded-xl h-10 shadow-lg font-bold hover:scale-[1.02] transition-transform active:scale-95"
          >
            Empty Trash
          </Button>
        </div>
      </div>

      {/* Styled Bulk Actions Bar (Pill design) */}
      {selectedItems.length > 0 && (
        <div className="bulk-actions-bar rounded-[24px] p-2 pr-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] fixed bottom-8 left-1/2 -translate-x-1/2 z-100 bg-[#1a1c1e] border border-white/5 w-[90%] max-w-[400px]">
          <div className="flex items-center gap-3 ml-2">
            <Button
              ghost
              size="small"
              shape="circle"
              icon={<CloseOutlined className="text-[10px]" />}
              onClick={clearSelection}
              className="hover:rotate-90 transition-transform flex items-center justify-center w-6 h-6 border-white/10 text-white/40 hover:text-white hover:border-white/30"
            />
            <div className="flex flex-col">
              <span className="text-white text-sm font-bold leading-none">{selectedItems.length} selected</span>
              <span className="text-white/40 text-[10px] uppercase font-black tracking-widest leading-none mt-1">
                Trash Management
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={handleBulkRestore}
              loading={isRestoring}
              className="rounded-[14px] font-bold border-none h-9 hover:scale-105 transition-all text-[#1a1c1e] bg-primary hover:bg-primary/90 text-xs px-4"
            >
              Restore
            </Button>
            <Button
              size="small"
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              className="rounded-[14px] font-bold h-9 border-none shadow-lg hover:scale-105 transition-all text-xs px-4 bg-danger hover:bg-danger-hover"
            >
              Delete Forever
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center w-full">
          <Loader size={32} />
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-line shadow-sm flex flex-col items-center justify-center py-24 px-8 mt-4 hover:border-primary/20 transition-colors">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
            className="w-24 h-24 rounded-full bg-danger-light flex items-center justify-center mb-6 shadow-inner"
          >
            <DeleteOutlined style={{ fontSize: "2.5rem", color: "var(--danger)" }} className="opacity-80" />
          </motion.div>
          <h2 className="text-2xl font-bold text-label mb-2 tracking-tight">Your trash is empty</h2>
          <p className="text-sm text-label-tertiary text-center max-w-xs leading-relaxed font-medium">
            Items you delete will appear here and be permanently removed after 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {/* Folders Section */}
          {folders.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-4 px-1 opacity-60">
                Deleted Folders
              </h2>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {folders.map((folder) => {
                  const id = folder._id || folder.id;
                  return (
                    <motion.div
                      key={id}
                      layout
                      className="opacity-80 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300"
                    >
                      <FolderItem
                        folder={{ ...folder, id }}
                        viewMode={viewMode}
                        isSelected={isSelected(id)}
                        onToggleSelect={(folderId) => toggleSelect(folderId, ItemTypes.FOLDER)}
                        onOpen={() => toggleSelect(id, ItemTypes.FOLDER)} // prevent navigation in trash, just select
                        onShowInfo={setInfoItem}
                        isTrashItem={true}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-4 px-1 opacity-60">
                Deleted Files
              </h2>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {files.map((file) => {
                  const id = file._id || file.id;
                  return (
                    <motion.div
                      key={id}
                      layout
                      className="opacity-80 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300"
                    >
                      <FileItem
                        file={{ ...file, id }}
                        viewMode={viewMode}
                        isSelected={isSelected(id)}
                        onToggleSelect={(fileId) => toggleSelect(fileId, ItemTypes.FILE)}
                        onOpen={() => toggleSelect(id, "file")} // prevent preview in trash, just select
                        onShowInfo={setInfoItem}
                        isTrashItem={true}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Infinite Scroll Loader */}
          <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4 w-full">
            {isFetching ? (
              <>
                <Loader size={24} />
                <span className="text-label-tertiary text-sm">Loading more items...</span>
              </>
            ) : paginationData?.hasNext ? (
              <span className="text-label-tertiary text-sm italic">Scroll for more</span>
            ) : (
              <span className="text-label-tertiary text-sm italic">No more items in trash</span>
            )}
          </div>
        </div>
      )}

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />
    </div>
  );
}

export default function TrashPage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      <TrashView />
    </motion.div>
  );
}
