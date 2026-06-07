// React core & third-party libraries
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, History } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetRecentFilesQuery, useTouchFileMutation } from "@services/api/fileApi";

// Constants
import { ApiBasePath, BulkServiceUrls } from "@constants/serviceUrls";
import { VIEW_MODES, TIME_LABELS } from "@constants/uiConstants";
import { ItemTypes } from "@shared-constants/constants";

// Utils
import { FileUtils } from "@shared-utils/utils";

// Components
import FloatingBulkActionsBar, { BulkAction } from "@components/files/FloatingBulkActionsBar";
import FileItem from "@components/files/FileItem";
import FilePreviewModal from "@components/files/FilePreviewModal";
import InfoDrawer from "@components/files/InfoDrawer";
import ListControls from "@components/files/ListControls";
import PageHeader from "@components/layout/PageHeader";
import Loader from "@components/common/Loader";

// Hooks
import { useFavoriteActions } from "@hooks/files/useFavoriteActions";
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";

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

  const { handleToggleFileFavorite, isFileFavoriting } = useFavoriteActions();

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

  useOutsideClickClear({ clearSelection });

  // Event handlers

  function handleBulkDownload() {
    if (selectedItems.length === 0) return;
    const fileItems = selectedItems.filter((i) => i.type === ItemTypes.FILE);
    if (fileItems.length === 0) {
      toast.warning("Please select at least one file to download");
      return;
    }

    try {
      const url = `${ApiBasePath}${BulkServiceUrls.bulkDownload}`;
      FileUtils.triggerPostDownload(url, { items: fileItems });
      toast.success("Preparing your download...");
      clearSelection();
    } catch {
      toast.error("Failed to initiate bulk download");
    }
  }

  // Render
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-8 pt-8 pb-4">
        <PageHeader
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
                              toggleSelect(id, ItemTypes.FILE);
                            }}
                            onOpen={() => {
                              setPreviewFile(file);
                              touchFile({ id });
                            }}
                            onShowInfo={() => {
                              setInfoItem({ ...file, id, type: "file" });
                            }}
                            onToggleFavorite={handleToggleFileFavorite}
                            isFavoriting={isFileFavoriting}
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
          allFiles={filteredItems}
          currentIndex={
            previewFile ? filteredItems.findIndex((f) => (f._id || f.id) === (previewFile._id || previewFile.id)) : -1
          }
          onNavigate={(index) => setPreviewFile(filteredItems[index])}
        />
      )}

      <FloatingBulkActionsBar selectedCount={selectedItems.length} clearSelection={clearSelection}>
        <BulkAction
          icon={<Download size={16} />}
          label="Download"
          tooltip="Download selection"
          onClick={handleBulkDownload}
        />
      </FloatingBulkActionsBar>
    </div>
  );
}
