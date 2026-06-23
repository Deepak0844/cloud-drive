// React core & third-party libraries
import PropTypes from "prop-types";
import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

// Hooks
import { useDebounce } from "@shared-hooks";

// Constants
import { QUERY_PARAMS_KEYS, TIMEOUTS } from "@shared-constants/constants";

// Components
import { Input } from "@components/ui/input";

export default function SearchInput({
  placeholder = "Search",
  className = "",
  queryKey = QUERY_PARAMS_KEYS.SEARCH,
  allowClear,
  prefix: _prefix,
  suffix,
  ...rest
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localValue, setLocalValue] = useState(searchParams.get(queryKey) || "");
  const debouncedValue = useDebounce(localValue, TIMEOUTS.DEBOUNCE_MS || 300);

  const lastPushedValue = useRef(searchParams.get(queryKey) || "");

  useEffect(() => {
    const urlValue = searchParams.get(queryKey) || "";
    if (urlValue !== lastPushedValue.current) {
      setLocalValue(urlValue);
      lastPushedValue.current = urlValue;
    }
  }, [searchParams, queryKey]);

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
            className="text-label-tertiary hover:text-label transition-colors p-1 cursor-pointer"
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

SearchInput.propTypes = {
  placeholder: PropTypes.string,
  className: PropTypes.string,
  queryKey: PropTypes.string,
  allowClear: PropTypes.bool,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
};
