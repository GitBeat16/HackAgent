"use client";

import type { ReactNode } from "react";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarFallback, AvatarImage, Avatar } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";

export interface NavbarProps {
  /** Current page/section title — supplied by the layout that mounts this, never hardcoded here. */
  title?: string;
  user?: { name: string; avatarUrl?: string };
  notificationCount?: number;
  /** Extra actions rendered before the user menu (e.g. an "Invite" button, a stage toggle). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Top app bar for the authenticated shell. Sits above `Sidebar`'s content
 * area; stays glassy on scroll so long dashboard pages never fully hide it
 * behind opaque chrome.
 */
export function Navbar({ title, user, notificationCount = 0, actions, className }: NavbarProps) {
  return (
    <header
      className={cn(
        "glass sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border px-4 sm:px-6",
        className,
      )}
    >
      {title && (
        <h1 className="hidden truncate font-display text-lg font-medium tracking-tight sm:block">{title}</h1>
      )}

      <div className="ml-auto flex w-full max-w-sm items-center gap-3 sm:ml-0">
        <Input
          type="search"
          placeholder="Search startups, reports, executives…"
          startAdornment={<Search />}
          className="hidden bg-surface-elevated sm:flex"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {actions}

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-signal" aria-hidden />
          )}
        </Button>

        {user && (
          <Avatar size="sm">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
