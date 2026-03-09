import React from "react";
import { Tooltip } from "antd";
import { AppstoreOutlined, BarsOutlined, FilterOutlined } from "@ant-design/icons";

// Constants
import { DefaultPagination, QUERY_PARAMS_KEYS } from "@shared-constants/constants";

// Components
import AdvancedFilterDropdown from "@components/search/AdvancedFilterDropdown";
import Button from "@shared-components/components/button";
import SearchInput from "@shared-components/components/search-input";

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
  const isTrashVariant = variant === "trash";

  const viewContainerClassName = isRecentVariant
    ? "flex items-center gap-1 bg-surface-dim p-1 rounded-xl border border-line"
    : isTrashVariant
      ? "flex items-center gap-1 bg-surface-alt p-1 rounded-xl shrink-0"
      : "bg-surface-alt p-1 rounded-xl flex items-center gap-1";

  const activeViewButtonClassName = isTrashVariant
    ? "bg-surface shadow-sm text-primary"
    : isRecentVariant
      ? ""
      : "bg-surface shadow-sm text-primary";

  const inactiveViewButtonClassName = isTrashVariant
    ? "text-label-secondary hover:bg-surface-alt"
    : isRecentVariant
      ? ""
      : "text-label-secondary hover:bg-surface-alt";

  const viewButtonBaseClassName = isRecentVariant
    ? "w-8 h-8 p-0 flex items-center justify-center rounded-lg"
    : isTrashVariant
      ? "rounded-lg w-8 h-8 flex items-center justify-center border-none"
      : "rounded-lg w-8 h-7 flex items-center justify-center border-none";

  return (
    <>
      {showSearchContainer ? (
        <div className={searchContainerClassName}>
          <SearchInput
            placeholder={placeholder}
            className={searchClassName}
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
                  <Tooltip title="Advanced Filters">
                    <div className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-alt cursor-pointer transition-all group/filter -mr-1">
                      <FilterOutlined
                        className={`text-xs ${Object.keys(advancedFilters).length > 0 ? "text-primary" : "text-label-tertiary"} group-hover/filter:text-primary`}
                      />
                    </div>
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
                <Tooltip title="Advanced Filters">
                  <div className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-alt cursor-pointer transition-all group/filter -mr-1">
                    <FilterOutlined
                      className={`text-xs ${Object.keys(advancedFilters).length > 0 ? "text-primary" : "text-label-tertiary"} group-hover/filter:text-primary`}
                    />
                  </div>
                </Tooltip>
              }
            />
          }
        />
      )}

      {isRecentVariant && <div className="w-px h-4 bg-line mx-1" />}

      <div className={viewContainerClassName}>
        <Button
          type={isRecentVariant ? undefined : viewMode === gridValue ? "default" : "text"}
          styleType={isRecentVariant ? (viewMode === gridValue ? "primary" : "ghost") : undefined}
          size="small"
          icon={<AppstoreOutlined />}
          onClick={() => setViewMode(gridValue)}
          className={`${viewButtonBaseClassName} ${viewMode === gridValue ? activeViewButtonClassName : inactiveViewButtonClassName}`}
        />
        <Button
          type={isRecentVariant ? undefined : viewMode === listValue ? "default" : "text"}
          styleType={isRecentVariant ? (viewMode === listValue ? "primary" : "ghost") : undefined}
          size="small"
          icon={<BarsOutlined />}
          onClick={() => setViewMode(listValue)}
          className={`${viewButtonBaseClassName} ${viewMode === listValue ? activeViewButtonClassName : inactiveViewButtonClassName}`}
        />
      </div>
    </>
  );
}
