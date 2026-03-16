import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@components/ui/dropdown-menu";

export default function Dropdown({ menu, children }) {
  // Extract items from AntD's menu property format: { items: [...] }
  const items = menu?.items || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      {/* 
        Force render on mount if needed, or stick to default (lazy).
        Aurora styling: glass-card with a premium shadow 
      */}
      <DropdownMenuContent align="end" className="w-52 glass-card border-white/10 shadow-premium p-1.5 z-50">
        {items.map((item, index) => {
          if (item.type === "divider") {
            return <DropdownMenuSeparator key={`div-${index}`} className="bg-white/10 my-1 -mx-1" />;
          }

          return (
            <DropdownMenuItem
              key={item.key || index}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled && item.onClick) {
                  item.onClick(e);
                }
              }}
              disabled={item.disabled}
              className={`flex items-center gap-2 cursor-pointer transition-colors rounded-md px-2 py-1.5 ${
                item.danger
                  ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                  : "hover:bg-white/10 focus:bg-white/10"
              }`}
            >
              {item.icon}
              <span className="flex-1 font-medium">{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
