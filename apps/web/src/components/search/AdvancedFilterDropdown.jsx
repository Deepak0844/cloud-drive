/* eslint-disable jsx-a11y/label-has-associated-control */

// React core & third-party libraries
import { X, Filter } from "lucide-react";
import React, { useState } from "react";

// Components
import { Button } from "@components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { Input } from "@components/ui/input";
import { Badge } from "@components/ui/badge";

// Constants
import { ByteMultipliers } from "@shared-constants/constants";
import { cn } from "@lib/utils";

const CATEGORIES = [
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Documents", value: "document" },
  { label: "Archives", value: "archive" },
  { label: "Other", value: "other" },
];

function AdvancedFilterDropdown({ onFilter, onClear, initialFilters = {}, trigger, align = "right" }) {
  // Local state
  const [filters, setFilters] = useState(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  // Event handlers
  function handleApply() {
    onFilter(filters);
    setIsOpen(false);
  }

  function handleClear() {
    setFilters({});
    onClear();
    setIsOpen(false);
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const activeFiltersCount = Object.keys(filters).filter((k) => filters[k] !== null && filters[k] !== undefined).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          <div className="cursor-pointer">{trigger}</div>
        ) : (
          <Button
            variant={isOpen ? "aurora" : "outline"}
            className={cn(
              "rounded-xl h-10 flex items-center gap-2 font-bold transition-all",
              isOpen ? "shadow-glow-sm" : "hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <Filter size={16} />
            Advanced Search
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-white border-none flex items-center justify-center text-[10px]"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="w-[360px] p-0 bg-surface/95 backdrop-blur-2xl border-white/10 shadow-premium rounded-3xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-label tracking-tight text-lg">Refine Search</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-lg hover:bg-surface-dim hover:text-primary transition-all"
            >
              <X size={16} />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
                Category
              </label>
              <Select
                value={filters.category || ""}
                onValueChange={(val) => updateFilter("category", val === "all" ? null : val)}
              >
                <SelectTrigger className="w-full bg-surface-alt/30 border-white/5 rounded-xl h-10">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="bg-surface/95 backdrop-blur-xl border-white/10 rounded-xl">
                  <SelectItem value="all">All types</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range - Using standard inputs for cleaner look/reliability */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="bg-surface-alt/30 border-white/5 rounded-xl h-10 text-xs"
                  value={filters.startDate ? filters.startDate.split("T")[0] : ""}
                  onChange={(e) =>
                    updateFilter("startDate", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                />
                <span className="text-label-tertiary opacity-50">-</span>
                <Input
                  type="date"
                  className="bg-surface-alt/30 border-white/5 rounded-xl h-10 text-xs"
                  value={filters.endDate ? filters.endDate.split("T")[0] : ""}
                  onChange={(e) =>
                    updateFilter("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                />
              </div>
            </div>

            {/* Size Range */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
                Size Range (MB)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="Min"
                  className="bg-surface-alt/30 border-white/5 rounded-xl h-10"
                  value={filters.minSize ? filters.minSize / ByteMultipliers.MB : ""}
                  onChange={(e) =>
                    updateFilter("minSize", e.target.value ? parseFloat(e.target.value) * ByteMultipliers.MB : null)
                  }
                />
                <span className="text-label-tertiary font-bold text-xs opacity-50">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  className="bg-surface-alt/30 border-white/5 rounded-xl h-10"
                  value={filters.maxSize ? filters.maxSize / ByteMultipliers.MB : ""}
                  onChange={(e) =>
                    updateFilter("maxSize", e.target.value ? parseFloat(e.target.value) * ByteMultipliers.MB : null)
                  }
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-label-tertiary opacity-70">
                Tags
              </label>
              <Input
                placeholder="Enter tags..."
                className="bg-surface-alt/30 border-white/5 rounded-xl h-10"
                value={filters.tag || ""}
                onChange={(e) => updateFilter("tag", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center gap-3">
          <Button variant="ghost" className="flex-1 h-11 rounded-2xl font-bold hover:bg-white/10" onClick={handleClear}>
            Reset
          </Button>
          <Button variant="aurora" className="flex-1 h-11 rounded-2xl font-black shadow-glow-sm" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AdvancedFilterDropdown;
