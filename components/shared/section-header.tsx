import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Small label above the title — only use when it encodes real structure (a module name, a phase), not decoration. */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The recurring header pattern for every dashboard/module section: an
 * optional eyebrow, a display-serif title, an optional description, and a
 * right-aligned action slot (button, filter, date range). Keeping this as
 * one component is what keeps section rhythm consistent across 15+ pages.
 */
export function SectionHeader({ eyebrow, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
