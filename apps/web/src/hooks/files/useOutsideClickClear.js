// React core & third-party libraries
import { useEffect } from "react";

const DEFAULT_IGNORE_SELECTORS = [
  ".animate-item",
  ".glass-bar",
  ".bulk-actions-bar",
  ".ant-modal-root",
  ".ant-modal-wrap",
  ".ant-modal-mask",
  ".ant-dropdown",
];

export function useOutsideClickClear({ clearSelection, ignoreSelectors = DEFAULT_IGNORE_SELECTORS }) {
  useEffect(() => {
    function handleClickOutside(event) {
      const shouldIgnore = ignoreSelectors.some((selector) => event.target.closest(selector));
      if (shouldIgnore) return;
      clearSelection();
    }

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [clearSelection, ignoreSelectors]);
}
