// React core & third-party libraries
import React, { useState } from "react";
import { toast } from "sonner";
import { LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Constants
import { STORAGE_KEYS } from "@shared-constants/constants";
import PageUrls from "@constants/pageUrls";

// Utils
import LocalStorage from "@utils/localStorageUtils";

// Hooks
import { useAuth } from "@hooks/useAuth";
import { useCurrentUser } from "@hooks/useCurrentUser";

// Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

export default function UserProfileDropdown({ isMobile }) {
  // Local state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Custom & shared hooks

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user: serverUser } = useCurrentUser();

  // Derived / computed variables (part 1)
  // Prefer server-authoritative data; fall back to localStorage during initial load
  const localUser = LocalStorage.get(STORAGE_KEYS.USER);
  const displayName = serverUser?.name ?? localUser?.name ?? "User";
  const displayEmail = serverUser?.email ?? localUser?.email ?? "";

  // Event handlers
  async function handleLogout() {
    try {
      await logout();
      toast.success("Logged out successfully!");
    } catch {
      // Errors handled by hook
    }
  }

  // Render
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={dropdownOpen ? false : undefined}>
        <TooltipTrigger asChild>
          <div>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <div
                  className="group flex items-center gap-2 cursor-pointer hover:bg-surface-dim/80 p-1.5 rounded-2xl transition-all duration-300 border border-transparent hover:border-line-base active:scale-95"
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className={`flex items-center justify-center rounded-full bg-linear-to-tr from-primary to-secondary text-white border-2 border-surface shadow-md shrink-0 group-hover:scale-105 transition-transform ${isMobile ? "w-8 h-8" : "w-10 h-10"}`}
                  >
                    <User size={isMobile ? 16 : 20} strokeWidth={2.5} />
                  </div>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={12}
                className="w-56 p-2 min-w-[200px] glass-card border-line shadow-premium rounded-2xl z-50"
              >
                <DropdownMenuItem
                  onClick={() => navigate(PageUrls.SettingsPage)}
                  className="font-bold rounded-xl cursor-pointer py-2 focus:bg-surface-dim"
                >
                  <User size={16} strokeWidth={2.5} className="mr-2" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(PageUrls.SettingsPage)}
                  className="font-bold rounded-xl cursor-pointer py-2 focus:bg-surface-dim"
                >
                  <Settings size={16} strokeWidth={2.5} className="mr-2" />
                  <span>Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-line/50 my-1" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="font-bold rounded-xl cursor-pointer py-2 text-error focus:text-error focus:bg-error/10"
                >
                  <LogOut size={16} strokeWidth={2.5} className="mr-2 text-error" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="bg-slate-800 text-slate-50 border-none px-3 py-2 shadow-xl"
        >
          <div className="flex flex-col">
            <p className="font-bold text-sm mb-0.5">{displayName}</p>
            <p className="text-[10px] opacity-80">{displayEmail}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
