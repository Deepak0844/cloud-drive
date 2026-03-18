import { Input } from "@components/ui/input";
import { Search } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";

// Hooks
import { useDebounce } from "@shared-hooks/hooks";

// Constants
import { QUERY_PARAMS_KEYS, TIMEOUTS } from "@shared-constants/constants";

/**
 * Search Input Component with built-in URL synchronization
 * @param {Object} props
 * @param {"small" | "middle" | "large"} [props.size]
 * @param {String} [props.placeholder]
 * @param {String} [props.className]
 * @param {String} [props.queryKey] - The URL query parameter key to sync with
 * @returns
 */
export default function SearchInput({
  placeholder = "Search",
  className = "",
  queryKey = QUERY_PARAMS_KEYS.SEARCH,
  // Destructure and discard AntD-specific props that shadcn Input doesn't support
  allowClear,
  prefix: _prefix,
  suffix,
  ...rest
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localValue, setLocalValue] = useState(searchParams.get(queryKey) || "");
  const debouncedValue = useDebounce(localValue, TIMEOUTS.DEBOUNCE_MS || 300);

  // Ref to track the last value we pushed to the URL to prevent recursive loops
  const lastPushedValue = useRef(searchParams.get(queryKey) || "");

  // Sync internal state with URL changes (e.g., back/forward buttons or clearing filters externally)
  useEffect(() => {
    const urlValue = searchParams.get(queryKey) || "";
    // Only update localValue if the URL change didn't come from our own push
    if (urlValue !== lastPushedValue.current) {
      setLocalValue(urlValue);
      lastPushedValue.current = urlValue;
    }
  }, [searchParams, queryKey]);

  // Push debounced value to URL
  useEffect(() => {
    const currentUrlValue = searchParams.get(queryKey) || "";
    if (debouncedValue !== currentUrlValue) {
      lastPushedValue.current = debouncedValue;

      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          if (debouncedValue) {
            newParams.set(queryKey, debouncedValue);
          } else {
            newParams.delete(queryKey);
          }
          return newParams;
        },
        { replace: true }
      );
    }
  }, [debouncedValue, queryKey, setSearchParams, searchParams]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search size={15} className="absolute left-3 text-label-tertiary pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="h-10 pl-9 pr-12 bg-surface-alt border-transparent focus-visible:ring-primary w-full"
        {...rest}
      />

      <div className="absolute right-2 flex items-center gap-1">
        {allowClear && localValue && (
          <button
            type="button"
            onClick={() => setLocalValue("")}
            className="text-label-tertiary hover:text-label transition-colors p-1"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        {suffix && <div className="flex items-center">{suffix}</div>}
      </div>
    </div>
  );
}
