// React core & third-party libraries
import { useMemo, useState } from "react";
import { message as antdMessage } from "antd";
import { X, Download, History } from "lucide-react";
import { motion } from "framer-motion";
import { FileUtils } from "@shared-utils/utils";

// Services (RTK Query hooks)
import { useGetRecentFilesQuery, useTouchFileMutation } from "@services/api/fileApi";

// Constants
import PageNames from "@constants/pageNames";
import { ApiBasePath, BulkServiceUrls } from "@constants/serviceUrls";
import { ItemTypes } from "@shared-constants/constants";

// Hooks
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";

// Components
import FileItem from "@components/files/FileItem";
import FilePreviewModal from "@components/files/FilePreviewModal";
import InfoDrawer from "@components/files/InfoDrawer";
import ListControls from "@components/files/ListControls";
import PageHeader from "@components/layout/PageHeader";
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";

const VIEW_MODES = {
  GRID: "grid",
  LIST: "list",
};

const TIME_LABELS = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  EARLIER: "Earlier",
};

export default function RecentPage() {
  // Redux hooks

  // Local state
  const [infoItem, setInfoItem] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const { clearSelection, selectedItems, toggleSelect } = useSelectableItems();
  const { advancedFilters, debouncedSearch, page, pageSize, setPage, updateParams } = useListPageParams();

  // RTK Query hooks
  const [touchFile] = useTouchFileMutation();

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

  // Custom & shared hooks
  const { loaderRef } = useInfinitePaging({
    hasNext: recentData?.pagination?.hasNext || false,
    isLoading: isFetching,
    page,
    setPage,
    updateParams,
  });

  // Derived / computed variables
  const paginationData = recentData?.pagination || {};
  const allItems = recentData?.data || [];
  const filteredItems = allItems;

  const timeGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    filteredItems.forEach((item) => {
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
  }, [filteredItems]);

  // Event handlers

  function handleBulkDownload() {
    if (selectedItems.length === 0) return;
    const fileItems = selectedItems.filter((i) => i.type === ItemTypes.FILE);
    if (fileItems.length === 0) {
      antdMessage.warning("Please select at least one file to download");
      return;
    }

    try {
      const url = `${ApiBasePath}${BulkServiceUrls.bulkDownload}`;
      FileUtils.triggerPostDownload(url, { items: fileItems });
      antdMessage.success("Preparing your download...");
      clearSelection();
    } catch {
      antdMessage.error("Failed to initiate bulk download");
    }
  }

  useOutsideClickClear({ clearSelection });

  // Render
  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-8 pt-8 pb-4">
        <PageHeader
          title={PageNames.RECENT}
          icon={
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
              <History className="text-xl text-primary" size={20} />
            </div>
          }
          breadcrumbNode={
            <Breadcrumb className="mt-1">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-label-tertiary font-medium">My Files</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-label font-bold">{PageNames.RECENT}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
          rightContent={
            <ListControls
              advancedFilters={advancedFilters}
              placeholder="Search recent..."
              searchClassName="h-10 w-64 md:w-80"
              showSearchContainer={false}
              updateParams={updateParams}
              viewMode={viewMode}
              setViewMode={setViewMode}
              gridValue={VIEW_MODES.GRID}
              listValue={VIEW_MODES.LIST}
              variant="recent"
            />
          }
        />
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
            <div className="w-24 h-24 mb-6 bg-surface-dim rounded-full flex items-center justify-center border border-line shadow-inner">
              <History className="text-4xl text-label-tertiary" size={40} />
            </div>
            <span className="text-lg font-bold text-label-secondary italic">No recent items found</span>
            <span className="text-label-tertiary text-sm">Tasks you work on will appear here</span>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-12 py-4">
            {Object.entries(timeGroups).map(
              ([key, items]) =>
                items.length > 0 && (
                  <section key={key}>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary">
                        {key === "today"
                          ? TIME_LABELS.TODAY
                          : key === "yesterday"
                            ? TIME_LABELS.YESTERDAY
                            : TIME_LABELS.EARLIER}
                      </span>
                      <div className="h-px flex-1 bg-linear-to-r from-line/50 to-transparent" />
                    </div>
                    <div
                      className={
                        viewMode === VIEW_MODES.GRID
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
                            onToggleSelect={() => {
                              toggleSelect(id, "file");
                            }}
                            onOpen={() => {
                              setPreviewFile(file);
                              touchFile({ id });
                            }}
                            onShowInfo={() => {
                              setInfoItem({ ...file, id, type: "file" });
                            }}
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
                  <Loader size={20} />
                  <span className="text-label-tertiary text-xs font-medium">Loading more items...</span>
                </>
              ) : paginationData?.hasNext ? (
                <span className="text-label-tertiary text-xs italic opacity-60">Scroll for more</span>
              ) : (
                <span className="text-label-tertiary text-xs italic opacity-40">No more items to show</span>
              )}
            </div>
          </div>
        )}
      </div>

      {infoItem && (
        <InfoDrawer
          item={infoItem}
          open={!!infoItem}
          onClose={() => {
            setInfoItem(null);
          }}
        />
      )}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          open={!!previewFile}
          onClose={() => {
            setPreviewFile(null);
          }}
        />
      )}

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
              <X size={14} />
              Deselect
            </Button>
            <div className="w-px h-4 bg-white/10" />
            <Button
              type="text"
              size="small"
              icon={<Download size={14} />}
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
