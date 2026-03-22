// React core & third-party libraries
import { useRef, useState } from "react";

export function useDragDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;

    const isFile = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files");
    if (isFile) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop() {
    setIsDragging(false);
    dragCounter.current = 0;
  }

  return { isDragging, handleDragEnter, handleDragLeave, handleDrop };
}
