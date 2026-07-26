import React, { useCallback, useState } from "react";
import { FlatList, Dimensions } from "react-native";

// Components
import MediaViewerPage from "./MediaViewerPage";

const { width } = Dimensions.get("window");

/**
 * Horizontal paging list between sibling files. Swipe is disabled while the active page
 * reports itself as zoomed in, so pinch-zoom and swipe-to-next never fight over the same
 * gesture — see `ImageViewer`'s `onZoomChange`.
 */
export default function MediaPager({
  items = [],
  index = 0,
  onIndexChange = () => {},
  controlsVisible = true,
  onTap = () => {},
}) {
  const [scrollEnabled, setScrollEnabled] = useState(true);

  function handleZoomChange(isZoomed) {
    setScrollEnabled(!isZoomed);
  }

  const getItemLayout = useCallback((_, i) => ({ length: width, offset: width * i, index: i }), []);

  function handleMomentumScrollEnd(event) {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (newIndex !== index) onIndexChange(newIndex);
  }

  return (
    <FlatList
      data={items}
      horizontal
      pagingEnabled
      scrollEnabled={scrollEnabled}
      initialScrollIndex={index}
      getItemLayout={getItemLayout}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      windowSize={3}
      initialNumToRender={1}
      maxToRenderPerBatch={1}
      removeClippedSubviews
      renderItem={({ item, index: itemIndex }) => (
        <MediaViewerPage
          file={item}
          isActive={itemIndex === index}
          controlsVisible={itemIndex === index && controlsVisible}
          onTap={onTap}
          onZoomChange={handleZoomChange}
        />
      )}
    />
  );
}
