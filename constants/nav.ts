import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Building2, Rocket, FileText, Settings, ListTodo } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "activeMeetings" | "pendingReports"; allowedRoles?: ("startup_founder" | "department_officer" | "platform_admin")[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const primaryNav: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Startup Hub",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: Rocket, allowedRoles: ["startup_founder"] },
      { label: "My Proposals", href: "/my-proposals", icon: FileText, allowedRoles: ["startup_founder"] },
    ],
  },
  {
    label: "Government Portal",
    items: [
      { label: "Post Challenge", href: "/challenges/new", icon: Building2, allowedRoles: ["department_officer"] },
      { label: "All Challenges", href: "/challenges", icon: ListTodo, allowedRoles: ["department_officer"] },
    ],
  },
];

export const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings }
];
