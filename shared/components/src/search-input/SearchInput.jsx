import { Input } from "@components/ui/input";
import { Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Hooks
import { useDebounce } from "@shared-hooks/hooks";

// Constants
import { QUERY_PARAMS_KEYS, TIMEOUTS } from "@shared-constants/constants";

// Components
import Icon from "../../common/icon/Icon";

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
  size,
  placeholder = "Search",
  className = "",
  queryKey = QUERY_PARAMS_KEYS.SEARCH,
  ...rest
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localValue, setLocalValue] = useState(searchParams.get(queryKey) || "");
  const debouncedValue = useDebounce(localValue, TIMEOUTS.DEBOUNCE_MS || 300);

  // Sync internal state with URL changes (e.g., back/forward buttons or clearing filters)
  useEffect(() => {
    const urlValue = searchParams.get(queryKey) || "";
    if (urlValue !== localValue && urlValue !== debouncedValue) {
      setLocalValue(urlValue);
    }
  }, [searchParams, queryKey, localValue, debouncedValue]);

  // Push debounced value to URL
  useEffect(() => {
    const currentUrlValue = searchParams.get(queryKey) || "";
    if (debouncedValue !== currentUrlValue) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedValue) {
        newParams.set(queryKey, debouncedValue);
      } else {
        newParams.delete(queryKey);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [debouncedValue, queryKey, searchParams, setSearchParams]);

  return (
    <Input
      size={size === "middle" ? "default" : size}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      prefix={<Icon icon={Search} className="text-label-tertiary" size="small" />}
      className={`h-10 sm:w-64 w-full bg-surface-alt border-transparent focus-visible:ring-primary ${className}`}
      {...rest}
    />
  );
}
