/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import { DatePicker, InputNumber, Select } from "antd";
import Button from "@shared-components/components/button";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

const { RangePicker } = DatePicker;

const CATEGORIES = [
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Documents", value: "document" },
  { label: "Archives", value: "archive" },
  { label: "Other", value: "other" },
];

function AdvancedFilterDropdown({ onFilter, onClear, initialFilters = {}, trigger, align = "right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const handleApply = () => {
    onFilter(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilters({});
    onClear();
    setIsOpen(false);
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative">
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        <Button
          icon={<FilterOutlined />}
          onClick={() => setIsOpen(!isOpen)}
          className={`rounded-xl border-line h-10 flex items-center gap-2 font-bold transition-all ${
            isOpen ? "bg-primary text-white border-primary" : "hover:border-primary hover:text-primary"
          }`}
        >
          Advanced Search
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-3 w-[360px] bg-white rounded-3xl border border-line shadow-2xl z-50 overflow-hidden`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-label-primary tracking-tight">Refine Search</h3>
                  <Button
                    type="text"
                    icon={<CloseOutlined className="text-[10px]" />}
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg hover:bg-surface-dim"
                  />
                </div>

                <div className="space-y-6">
                  {/* Category */}
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary mb-2 block">
                      Category
                    </label>
                    <Select
                      placeholder="Select type"
                      className="w-full premium-select"
                      options={CATEGORIES}
                      value={filters.category}
                      onChange={(val) => updateFilter("category", val)}
                      allowClear
                    />
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary mb-2 block">
                      Date Modified
                    </label>
                    <RangePicker
                      className="w-full premium-datepicker"
                      onChange={(dates) => {
                        updateFilter("startDate", dates?.[0]?.toISOString());
                        updateFilter("endDate", dates?.[1]?.toISOString());
                      }}
                    />
                  </div>

                  {/* Size Range */}
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary mb-2 block">
                      Size (MB)
                    </label>
                    <div className="flex items-center gap-3">
                      <InputNumber
                        placeholder="Min"
                        className="flex-1 premium-input-number"
                        min={0}
                        onChange={(val) => updateFilter("minSize", val ? val * 1000 * 1000 : undefined)}
                      />
                      <span className="text-label-tertiary font-bold">to</span>
                      <InputNumber
                        placeholder="Max"
                        className="flex-1 premium-input-number"
                        min={0}
                        onChange={(val) => updateFilter("maxSize", val ? val * 1000 * 1000 : undefined)}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary mb-2 block">
                      Tags
                    </label>
                    <Select
                      mode="tags"
                      placeholder="Enter tags"
                      className="w-full premium-select"
                      value={filters.tag ? [filters.tag] : []}
                      onChange={(vals) => updateFilter("tag", vals[vals.length - 1])}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface-dim border-t border-line flex items-center gap-3">
                <Button block className="h-11 rounded-2xl font-bold border-line-strong" onClick={handleClear}>
                  Reset
                </Button>
                <Button
                  block
                  type="primary"
                  className="h-11 rounded-2xl font-black shadow-xl shadow-primary/20"
                  onClick={handleApply}
                >
                  Apply Filters
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdvancedFilterDropdown;
