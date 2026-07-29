import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Gavel,
  FileBarChart,
  LineChart,
  Presentation,
  FileText,
  HeartPulse,
  History,
  KanbanSquare,
  Settings,
  Compass,
  ScrollText,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short badge, e.g. a live meeting count — populated from data later. */
  badgeKey?: "activeMeetings" | "pendingReports";
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Primary sidebar structure, grouped to match the PRD's information
 * architecture. Hrefs are declared now so `Sidebar`/`Navbar` can render
 * active states even before every route has a page behind it.
 */
export const primaryNav: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Boardroom", href: "/boardroom", icon: Gavel, badgeKey: "activeMeetings" },
      { label: "New meeting", href: "/meeting/new", icon: Compass },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Reports", href: "/reports", icon: FileBarChart, badgeKey: "pendingReports" },
      { label: "Market research", href: "/market-research", icon: LineChart },
      { label: "Financials", href: "/financials", icon: FileText },
      { label: "Startup health", href: "/startup-health", icon: HeartPulse },
    ],
  },
  {
    label: "Studio",
    items: [
      { label: "Executives", href: "/executives", icon: Users },
      { label: "Pitch deck", href: "/pitch-deck", icon: Presentation },
      { label: "PRD generator", href: "/prd-generator", icon: ScrollText },
      { label: "Kanban", href: "/kanban", icon: KanbanSquare },
      { label: "History", href: "/history", icon: History },
    ],
  },
];

export const secondaryNav: NavItem[] = [{ label: "Settings", href: "/settings", icon: Settings }];
