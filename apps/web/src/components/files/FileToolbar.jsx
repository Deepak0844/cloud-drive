// React core & third-party libraries
import React from "react";
import { LayoutGrid, List, Plus, Upload, ChevronDown, ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@lib/utils";

// Constants
import { DefaultPagination, QUERY_PARAMS_KEYS } from "@shared-constants/constants";

// Components
import AdvancedFilterDropdown from "@components/search/AdvancedFilterDropdown";
import { Button } from "@components/ui/button";
import SearchInput from "@components/common/SearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

export default function FileToolbar({
  advancedFilters,
  updateParams,
  sortBy,
  sortOrder,
  viewMode,
  setViewMode,
  handleUploadClick,
  handleCreateFolder,
}) {
  const currentSortKey = `${sortBy}-${sortOrder}`;

  const sortOptions = [
    { key: "updatedAt-desc", label: "Newest First" },
    { key: "updatedAt-asc", label: "Oldest First" },
    { key: "name-asc", label: "Name (A-Z)" },
    { key: "name-desc", label: "Name (Z-A)" },
    { key: "size-desc", label: "Largest First" },
    { key: "size-asc", label: "Smallest First" },
  ];

  const handleSortChange = (key) => {
    const [f, o] = key.split("-");
    updateParams({
      [QUERY_PARAMS_KEYS.SORT_BY]: f,
      [QUERY_PARAMS_KEYS.SORT_ORDER]: o,
      [QUERY_PARAMS_KEYS.PAGE_NO]: DefaultPagination.pageNumber,
    });
  };

  return (
    <TooltipProvider>
      <div className="flex gap-3 grow justify-end items-center">
        {/* Search & Filters */}
        <div className="w-64 flex-none">
          <SearchInput
            id="search-input"
            name="search"
            placeholder="Search in My Files..."
            allowClear
            suffix={
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <AdvancedFilterDropdown
                      initialFilters={advancedFilters}
                      onFilter={(filters) =>
                        updateParams({
                          [QUERY_PARAMS_KEYS.CATEGORY]: filters.category,
                          [QUERY_PARAMS_KEYS.START_DATE]: filters.startDate,
                          [QUERY_PARAMS_KEYS.END_DATE]: filters.endDate,
                          [QUERY_PARAMS_KEYS.MIN_SIZE]: filters.minSize,
                          [QUERY_PARAMS_KEYS.MAX_SIZE]: filters.maxSize,
                          [QUERY_PARAMS_KEYS.TAG]: filters.tag,
                          [QUERY_PARAMS_KEYS.PAGE_NO]: DefaultPagination.pageNumber,
                        })
                      }
                      onClear={() =>
                        updateParams({
                          [QUERY_PARAMS_KEYS.CATEGORY]: null,
                          [QUERY_PARAMS_KEYS.START_DATE]: null,
                          [QUERY_PARAMS_KEYS.END_DATE]: null,
                          [QUERY_PARAMS_KEYS.MIN_SIZE]: null,
                          [QUERY_PARAMS_KEYS.MAX_SIZE]: null,
                          [QUERY_PARAMS_KEYS.TAG]: null,
                          [QUERY_PARAMS_KEYS.PAGE_NO]: DefaultPagination.pageNumber,
                        })
                      }
                      trigger={
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer transition-all group/filter mr-1">
                          <Filter
                            size={14}
                            className={cn(
                              "transition-colors",
                              Object.keys(advancedFilters || {}).length > 0
                                ? "text-primary stroke-3"
                                : "text-label-tertiary group-hover/filter:text-label-secondary"
                            )}
                          />
                        </div>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold text-white">
                  Advanced Filters
                </TooltipContent>
              </Tooltip>
            }
            className="premium-nav-search"
          />
        </div>

        {/* Sorting Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl px-3 bg-surface-alt/50 border-white/5 hover:bg-white/10 text-label-secondary font-bold text-xs gap-2"
            >
              <ArrowUpDown size={14} className="text-primary" />
              <span>Sort</span>
              <ChevronDown size={14} className="opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-surface/95 backdrop-blur-xl border-white/10 rounded-2xl p-1 shadow-premium"
          >
            <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-label-tertiary px-3 py-2">
              Sort By
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5 mx-1" />
            <DropdownMenuRadioGroup value={currentSortKey} onValueChange={handleSortChange}>
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.key}
                  value={option.key}
                  className="rounded-lg py-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-all text-sm font-semibold pr-8"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Toggle */}
        <div className="bg-surface-alt/50 p-1 rounded-xl flex items-center gap-1 border border-white/5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  viewMode === "grid"
                    ? "bg-primary text-white shadow-glow-sm hover:bg-primary/90"
                    : "text-label-tertiary hover:bg-white/5 hover:text-label-secondary"
                )}
              >
                <LayoutGrid size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold text-white">
              Grid View
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  viewMode === "list"
                    ? "bg-primary text-white shadow-glow-sm hover:bg-primary/90"
                    : "text-label-tertiary hover:bg-white/5 hover:text-label-secondary"
                )}
              >
                <List size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold text-white">
              List View
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Global Action Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="aurora"
              className="rounded-xl h-10 px-5 font-bold shadow-glow text-sm flex items-center gap-2 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>New</span>
              <ChevronDown size={14} className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-surface/95 backdrop-blur-xl border-white/10 rounded-2xl p-1 shadow-premium"
          >
            <DropdownMenuItem
              onClick={handleUploadClick}
              className="rounded-lg py-2.5 cursor-pointer focus:bg-primary/10 focus:text-primary transition-all text-sm font-bold gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-focus:scale-110 transition-transform">
                <Upload size={16} />
              </div>
              Upload File
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5 mx-1" />
            <DropdownMenuItem
              onClick={handleCreateFolder}
              className="rounded-lg py-2.5 cursor-pointer focus:bg-primary/10 focus:text-primary transition-all text-sm font-bold gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-focus:scale-110 transition-transform">
                <Plus size={16} />
              </div>
              New Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
