// React core & third-party libraries
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Download, ImageIcon, Clock, Maximize2, History } from "lucide-react";
import dayjs from "dayjs";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetFilesQuery } from "@services/api/fileApi";

// Hooks
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useFileActions } from "@hooks/files/useFileActions";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";
import PageUrls from "@constants/pageUrls";
import { FileCategories } from "@shared-constants/constants";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Components
import { Button } from "@components/ui/button";
import FilePreviewModal from "@components/files/FilePreviewModal";
import Loader from "@components/common/Loader";
import PageHeader from "@components/layout/PageHeader";
import { Skeleton } from "@components/ui/skeleton";

function PhotosPage() {
  const [previewFile, setPreviewFile] = useState(null);
  const { page, pageSize, setPage, updateParams } = useListPageParams({ defaultPageSize: 50 });
  const { handleDownload } = useFileActions({ folders: [], clearSelection: () => {} });

  // RTK Query hooks
  const {
    data: filesResponse,
    isLoading,
    isFetching,
  } = useGetFilesQuery({
    category: FileCategories.IMAGE,
    recursive: true,
    pg: page,
    ps: pageSize,
  });

  // Derived / computed variables (part 1)
  const hasNextPage = filesResponse?.pagination?.hasNext || false;

  // Custom & shared hooks
  const { loaderRef } = useInfinitePaging({
    hasNext: hasNextPage,
    isLoading: isFetching,
    page,
    setPage,
    updateParams,
  });

  // Derived / computed variables (part 2)
  const photos = useMemo(() => filesResponse?.data || [], [filesResponse]);

  // Group photos by Month/Year
  const groupedPhotos = useMemo(() => {
    const groups = {};
    [...photos]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((photo) => {
        const date = dayjs(photo.createdAt);
        const groupKey = date.format("MMMM YYYY");
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(photo);
      });
    return Object.entries(groups).map(([group, groupPhotos]) => [
      group,
      groupPhotos.map((p) => {
        const id = p._id || p.id;
        return {
          ...p,
          thumbnailUrl: UrlUtils.format(`${ApiBasePath}${FileServiceUrls.thumbnail}`, { id }),
          previewUrl: UrlUtils.format(`${ApiBasePath}${FileServiceUrls.preview}`, { id }),
        };
      }),
    ]);
  }, [photos]);

  // Render
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
          <ImageIcon size={48} className="text-primary opacity-40" />
        </div>
        <h3 className="text-2xl font-black text-label mb-2 tracking-tight italic">No Photos Found</h3>
        <p className="text-label-tertiary mb-8 max-w-sm font-medium leading-relaxed">
          Your visual memories will appear here once you upload some images to your cloud drive.
        </p>
        <Link to={PageUrls.MyFilesPage}>
          <Button variant="aurora" size="pill" className="px-10 h-12 font-black italic">
            Upload Photos
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8 pb-32">
      <PageHeader />

      <div className="flex flex-col gap-12">
        {groupedPhotos.map(([group, groupPhotos]) => (
          <div key={group} className="flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-surface-dim flex items-center justify-center text-label-tertiary border border-line/30 shadow-inner">
                <Calendar size={18} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-black text-label tracking-tight italic leading-none">{group}</h2>
                <span className="text-[10px] font-bold uppercase text-label-tertiary tracking-widest mt-1">
                  Collection of memories
                </span>
              </div>
              <div className="h-px bg-linear-to-r from-line/40 to-transparent grow ml-4" />
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-glow-sm">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">
                  {groupPhotos.length} Items
                </span>
              </div>
            </div>

            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-6 space-y-6">
              {groupPhotos.map((photo) => (
                <div key={photo._id || photo.id} className="break-inside-avoid">
                  <PhotoCard photo={photo} handleDownload={handleDownload} onPreview={() => setPreviewFile(photo)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite Scroll Loader */}
      <div ref={loaderRef} className="py-12 flex flex-col items-center justify-center w-full gap-4">
        {isFetching && page > 1 && (
          <>
            <Loader size={24} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary animate-pulse">
              Syncing more memories...
            </span>
          </>
        )}
        {!hasNextPage && photos.length > 0 && (
          <div className="flex flex-col items-center gap-3 opacity-40 scale-90">
            <div className="h-px bg-linear-to-r from-transparent via-line to-transparent w-48" />
            <div className="flex items-center gap-2">
              <History size={12} className="text-label-tertiary" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-label-tertiary">
                End of Gallery
              </span>
            </div>
          </div>
        )}
      </div>

      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        handleDownload={handleDownload}
        allFiles={photos}
        currentIndex={
          previewFile ? photos.findIndex((p) => (p._id || p.id) === (previewFile._id || previewFile.id)) : -1
        }
        onNavigate={(index) => setPreviewFile(photos[index])}
      />
    </motion.div>
  );
}

function PhotoCard({ photo, handleDownload, onPreview }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPreview?.()}
      className="group relative aspect-auto rounded-3xl overflow-hidden bg-surface-alt border border-white/5 cursor-pointer shadow-glow-sm hover:shadow-glow hover:border-primary/40 transition-all duration-500 ease-out mb-6"
    >
      <img
        src={photo.thumbnailUrl}
        alt={photo.name}
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-20 group-hover:grayscale-0"
        loading="lazy"
        onError={(e) => {
          e.target.src = "/api/placeholder/400/400";
        }}
      />

      {/* Glossmorphic Overlay */}
      <div className="absolute inset-x-3 bottom-3 p-4 bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 pointer-events-none z-10 shadow-2xl scale-95 group-hover:scale-100">
        <span className="text-[11px] font-black text-white truncate block uppercase tracking-wider">{photo.name}</span>
        <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
          <Clock size={10} className="text-white/60" />
          <span className="text-[9px] font-bold text-white/70 block tabular-nums">
            {dayjs(photo.createdAt).format("MMM D, YYYY")}
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex gap-2 z-10 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload?.(photo);
          }}
          className="w-9 h-9 bg-black/40 hover:bg-primary/60 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer shadow-glow-sm hover:scale-110 active:scale-90"
        >
          <Download size={14} className="text-white" />
        </button>
        <button
          className="w-9 h-9 bg-black/40 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer shadow-glow-sm hover:scale-110"
          onClick={() => window.open(photo.previewUrl, "_blank")}
        >
          <Maximize2 size={14} className="text-white" />
        </button>
      </div>
    </motion.div>
  );
}

export default PhotosPage;
