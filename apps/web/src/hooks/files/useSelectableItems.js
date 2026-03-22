// React core & third-party libraries
import { useCallback, useState } from "react";

export function useSelectableItems() {
  const [selectedItems, setSelectedItems] = useState([]);

  function toggleSelect(id, type) {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      }
      return [...prev, { id, type }];
    });
  }

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  function isSelected(id) {
    return selectedItems.some((item) => item.id === id);
  }

  return {
    clearSelection,
    isSelected,
    selectedItems,
    setSelectedItems,
    toggleSelect,
  };
}
