"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { primaryNav, secondaryNav } from "@/constants/nav";

const allNavItems = [...primaryNav.flatMap((s) => s.items), ...secondaryNav];

function titleForPath(pathname: string) {
  const match = allNavItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.label ?? "BoardroomAI";
}

/**
 * The authenticated app shell: collapsible Sidebar + top Navbar wrapping
 * every page under the `(app)` route group. Live badge counts are mocked
 * here since there's no backend yet — swap for real data without touching
 * Sidebar/Navbar themselves.
 */
export function AppShell({ children, user }: { children: ReactNode; user: { name: string; avatarUrl?: string } }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        badgeCounts={{ activeMeetings: 2, pendingReports: 5 }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={titleForPath(pathname ?? "")} user={user} notificationCount={3} />
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-none py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
