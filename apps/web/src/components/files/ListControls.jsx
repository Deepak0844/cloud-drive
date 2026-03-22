// React core & third-party libraries
import React from "react";
import { LayoutGrid, List, Filter } from "lucide-react";

// Constants
import { DefaultPagination, QUERY_PARAMS_KEYS } from "@shared-constants/constants";

// Utils
import { cn } from "@lib/utils";

// Components
import AdvancedFilterDropdown from "@components/search/AdvancedFilterDropdown";
import { Button } from "@components/ui/button";
import SearchInput from "@components/common/SearchInput";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

export default function ListControls({
  advancedFilters,
  placeholder,
  searchClassName = "h-10 w-full",
  showSearchContainer = true,
  searchContainerClassName = "w-56 flex-none",
  updateParams,
  viewMode,
  setViewMode,
  gridValue = "grid",
  listValue = "list",
  variant = "default",
}) {
  const isRecentVariant = variant === "recent";

  const viewContainerClassName = cn(
    "flex items-center gap-1 p-1 rounded-xl",
    isRecentVariant ? "bg-surface-dim border border-white/5" : "bg-surface-alt"
  );

  const viewButtonBaseClassName = "w-8 h-8 p-0 flex items-center justify-center rounded-lg transition-all border-none";

  const activeViewClass = "bg-primary text-white shadow-glow-sm hover:bg-primary/90";
  const inactiveViewClass = "text-label-tertiary hover:bg-white/5 hover:text-label-secondary";

  const filtersActive = Object.keys(advancedFilters).length > 0;

  return (
    <TooltipProvider>
      {showSearchContainer ? (
        <div className={cn(searchContainerClassName, "flex items-center")}>
          <SearchInput
            placeholder={placeholder}
            className={searchClassName}
            allowClear
            suffix={
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer transition-all group/filter mr-1">
                        <Filter
                          size={14}
                          className={cn(
                            "transition-colors",
                            filtersActive
                              ? "text-primary stroke-3"
                              : "text-label-tertiary group-hover/filter:text-label-secondary"
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold">
                      Advanced Filters
                    </TooltipContent>
                  </Tooltip>
                }
              />
            }
          />
        </div>
      ) : (
        <SearchInput
          placeholder={placeholder}
          className={searchClassName}
          allowClear
          suffix={
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer transition-all group/filter mr-1">
                      <Filter
                        size={14}
                        className={cn(
                          "transition-colors",
                          filtersActive
                            ? "text-primary stroke-3"
                            : "text-label-tertiary group-hover/filter:text-label-secondary"
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold">
                    Advanced Filters
                  </TooltipContent>
                </Tooltip>
              }
            />
          }
        />
      )}

      {isRecentVariant && <div className="w-px h-4 bg-white/10 mx-2" />}

      <div className={viewContainerClassName}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(gridValue)}
              className={cn(viewButtonBaseClassName, viewMode === gridValue ? activeViewClass : inactiveViewClass)}
            >
              <LayoutGrid size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold">
            Grid View
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(listValue)}
              className={cn(viewButtonBaseClassName, viewMode === listValue ? activeViewClass : inactiveViewClass)}
            >
              <List size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-surface/90 backdrop-blur-md border-white/10 text-xs font-bold">
            List View
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
