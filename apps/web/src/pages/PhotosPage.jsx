import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb, Empty, Skeleton, Typography, Image } from "antd";
import { PictureOutlined, CalendarOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

// api
import { useGetFilesQuery } from "@services/api/fileApi";

// constants
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";

// components
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";

import { useInfiniteScroll } from "@shared-hooks/hooks";

const { Text } = Typography;

const PhotosPage = () => {
  const [page, setPage] = React.useState(1);

  const {
    data: filesResponse,
    isLoading,
    isFetching,
  } = useGetFilesQuery({
    category: "image",
    recursive: true,
    pg: page,
    ps: 50,
  });

  const hasNextPage = filesResponse?.pagination?.hasNext || false;

  const { loaderRef } = useInfiniteScroll({
    hasNext: hasNextPage,
    isLoading: isFetching,
    onLoadMore: () => setPage((prev) => prev + 1),
  });

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
      groupPhotos.map((p) => ({
        ...p,
        thumbnailUrl: `/api/v1/files/${p._id}/preview?thumbnail=true`,
        previewUrl: `/api/v1/files/${p._id}/preview`,
      })),
    ]);
  }, [photos]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="px-1 mb-4">
          <Skeleton.Button active size="large" shape="round" style={{ width: 150 }} />
          <div className="mt-2">
            <Skeleton.Input active size="small" style={{ width: 200 }} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <Skeleton.Node key={i} active className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <Empty
          image={<PictureOutlined style={{ fontSize: 64, color: "var(--primary)", opacity: 0.2 }} />}
          description={
            <div className="max-w-xs mx-auto">
              <h3 className="text-xl font-bold text-label-primary mb-1">No Photos Found</h3>
              <p className="text-label-tertiary">Your visual memories will appear here once you upload some images.</p>
            </div>
          }
        >
          <Link to={PageUrls.MyFilesPage}>
            <Button styleType="primary" className="rounded-2xl px-8 h-12 font-bold shadow-lg shadow-primary/20">
              Upload Photos
            </Button>
          </Link>
        </Empty>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8 pb-32">
      <div className="px-1">
        <h1 className="text-3xl font-black text-label-primary tracking-tight mb-2">{PageNames.PHOTOS}</h1>
        <Breadcrumb
          items={[
            {
              title: (
                <Link to={PageUrls.DashboardPage} className="text-label-tertiary hover:text-primary transition-colors">
                  {PageNames.MY_FILES}
                </Link>
              ),
            },
            { title: <span className="text-label-primary font-bold">{PageNames.PHOTOS}</span> },
          ]}
        />
      </div>

      <div className="flex flex-col gap-12">
        {groupedPhotos.map(([group, groupPhotos]) => (
          <div key={group} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-label-tertiary">
                <CalendarOutlined />
              </div>
              <h2 className="text-lg font-black text-label-secondary tracking-tight">{group}</h2>
              <div className="h-px bg-line grow" />
              <Text className="text-[10px] font-black uppercase text-label-tertiary tracking-widest">
                {groupPhotos.length} Items
              </Text>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <Image.PreviewGroup>
                {groupPhotos.map((photo) => (
                  <PhotoCard key={photo._id} photo={photo} />
                ))}
              </Image.PreviewGroup>
            </div>
          </div>
        ))}
      </div>

      {/* Infinite Scroll Loader */}
      <div ref={loaderRef} className="py-12 flex flex-col items-center justify-center w-full gap-4">
        {isFetching && page > 1 && (
          <>
            <Loader size={32} />
            <Text type="secondary" className="text-xs font-bold uppercase tracking-widest opacity-50">
              Loading more memories...
            </Text>
          </>
        )}
        {!hasNextPage && photos.length > 0 && (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <div className="h-px bg-line w-24" />
            <Text className="text-[10px] font-black uppercase tracking-[0.2em]">End of Gallery</Text>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PhotoCard = ({ photo }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative aspect-square rounded-[24px] overflow-hidden bg-surface-alt border border-line/50 cursor-pointer shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300"
    >
      <Image
        src={photo.thumbnailUrl}
        preview={{
          src: photo.previewUrl,
          mask: (
            <div className="flex flex-col items-center gap-2">
              <PictureOutlined className="text-2xl" />
              <Text className="text-[10px] font-black uppercase text-white tracking-widest">View Full</Text>
            </div>
          ),
        }}
        alt={photo.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        wrapperClassName="w-full h-full"
        fallback="/api/placeholder/400/400"
      />

      {/* Glassmorphic Overlay (only visible on non-hover to not interfere with mask) */}
      <div className="absolute inset-x-2 bottom-2 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-10">
        <Text className="text-[9px] font-black text-white truncate block uppercase tracking-wider shadow-sm">
          {photo.name}
        </Text>
        <Text className="text-[8px] font-bold text-white/80 block mt-0.5 tabular-nums">
          {dayjs(photo.createdAt).format("MMM D, YYYY")}
        </Text>
      </div>

      {/* Top Right Icon */}
      <div className="absolute top-2 right-2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <PictureOutlined className="text-white text-xs" />
      </div>
    </motion.div>
  );
};

export default PhotosPage;
