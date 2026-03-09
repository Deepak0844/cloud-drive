// React core & third-party libraries
import React from "react";
import { Dropdown, Tooltip } from "antd";
import { AppstoreOutlined, BarsOutlined, FilterOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";

// Constants
import { DefaultPagination, ItemTypes, QUERY_PARAMS_KEYS } from "@shared-constants/constants";

// Components
import AdvancedFilterDropdown from "@components/search/AdvancedFilterDropdown";
import Button from "@shared-components/components/button";
import SearchInput from "@shared-components/components/search-input";

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
  // Render
  return (
    <div className="flex gap-2 grow justify-end items-center">
      <div className="w-56 flex-none">
        <SearchInput
          id="search-input"
          name="search"
          placeholder="Search in My Files..."
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
          className="h-10 rounded-xl border-line bg-surface shadow-sm focus:shadow-md transition-all text-sm w-full premium-nav-search"
          allowClear
        />
      </div>

      <div className="bg-surface-alt p-1 rounded-xl flex items-center gap-1">
        <Dropdown
          menu={{
            items: [
              { key: "updatedAt-desc", label: "Newest First" },
              { key: "updatedAt-asc", label: "Oldest First" },
              { key: "name-asc", label: "Name (A-Z)" },
              { key: "name-desc", label: "Name (Z-A)" },
              { key: "size-desc", label: "Largest First" },
              { key: "size-asc", label: "Smallest First" },
            ],
            onClick: ({ key }) => {
              const [f, o] = key.split("-");
              updateParams({
                [QUERY_PARAMS_KEYS.SORT_BY]: f,
                [QUERY_PARAMS_KEYS.SORT_ORDER]: o,
                [QUERY_PARAMS_KEYS.PAGE_NO]: DefaultPagination.pageNumber,
              });
            },
            selectable: true,
            defaultSelectedKeys: [`${sortBy}-${sortOrder}`],
          }}
          trigger={["click"]}
        >
          <Button type="text" className="rounded-lg text-xs font-bold text-label-secondary">
            Sort
          </Button>
        </Dropdown>
      </div>

      <div className="bg-surface-alt p-1 rounded-xl flex items-center gap-1">
        <Button
          type={viewMode === "grid" ? "default" : "text"}
          size="small"
          icon={<AppstoreOutlined />}
          onClick={() => setViewMode("grid")}
          className={`rounded-lg w-8 h-7 flex items-center justify-center border-none ${viewMode === "grid" ? "bg-surface shadow-sm text-primary" : "text-label-secondary hover:bg-surface-alt"}`}
        />
        <Button
          type={viewMode === "list" ? "default" : "text"}
          size="small"
          icon={<BarsOutlined />}
          onClick={() => setViewMode("list")}
          className={`rounded-lg w-8 h-7 flex items-center justify-center border-none ${viewMode === "list" ? "bg-surface shadow-sm text-primary" : "text-label-secondary hover:bg-surface-alt"}`}
        />
      </div>

      <Dropdown
        menu={{
          items: [
            { key: "upload", label: "Upload File", icon: <UploadOutlined /> },
            { key: ItemTypes.FOLDER, label: "New Folder", icon: <PlusOutlined /> },
          ],
          onClick: ({ key }) => {
            if (key === "upload") handleUploadClick();
            else if (key === ItemTypes.FOLDER) handleCreateFolder();
          },
        }}
        placement="bottomRight"
        trigger={["click"]}
      >
        <Button
          type="primary"
          className="rounded-xl h-10 px-4 font-bold shadow-primary text-sm flex items-center gap-2"
        >
          <PlusOutlined />
          <span>New</span>
        </Button>
      </Dropdown>
    </div>
  );
}
