import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "antd";
import { Search } from "lucide-react";

// Components
import { Icon } from "@mavinlabs/react-js-components";

// CSS
import "./SearchInput.css";

/**
 * Search Input Component
 * @param {String} size : Small || Medium || Large
 * @param {String} placeholder
 * @param {String} className
 * @param {Other Props} rest
 * @returns
 */
export default function SearchInput({ size = "", placeholder = "Search", className = "", ...rest }) {
  // Query Params
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state to manage the search input value
  const value = searchParams.get("search") || "";
  const [searchText, setSearchText] = useState(value);

  //
  function handleSearch(e) {
    if (e.key !== "Enter") {
      return;
    }
    const searchValue = e.target.value || "";

    // Update search query in the URL
    const params = {
      ...Object.fromEntries([...searchParams]),
      search: searchValue,
    };

    setSearchParams(params);
    setSearchText(searchValue);
  }

  //
  function handleClear() {
    setSearchText("");
    setSearchParams("");
  }

  return (
    <Input
      size={size}
      placeholder={placeholder}
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      onKeyDown={handleSearch}
      prefix={<Icon icon={Search} className="icon-light" />}
      className={`search-input ${className}`}
      allowClear={true}
      onClear={handleClear}
      {...rest}
    />
  );
}
