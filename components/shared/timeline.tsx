import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEntry, Tone } from "@/types/common";

const toneDotClass: Record<Tone, string> = {
  brass: "bg-primary border-primary/30",
  signal: "bg-signal border-signal/30",
  success: "bg-success border-success/30",
  warning: "bg-warning border-warning/30",
  destructive: "bg-destructive border-destructive/30",
  muted: "bg-muted-foreground border-border",
};

export interface TimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

/**
 * Vertical timeline for anything sequential and real: debate transcripts,
 * discussion history, version history. Order carries information here, so
 * the connecting rule and dot markers are load-bearing, not decorative.
 */
export function Timeline({ entries, className }: TimelineProps) {
  return (
    <ol className={cn("relative space-y-6 pl-6", className)}>
      <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border" aria-hidden />
      {entries.map((entry) => {
        const Icon = entry.icon ?? Circle;
        const tone = entry.tone ?? "brass";
        return (
          <li key={entry.id} className="relative">
            <span
              className={cn(
                "absolute -left-6 top-1 flex size-2.5 items-center justify-center rounded-full border",
                toneDotClass[tone],
              )}
              aria-hidden
            >
              {entry.icon && <Icon className="size-2.5 text-background" />}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-foreground">{entry.title}</p>
              <time className="font-mono text-xs text-muted-foreground">
                {typeof entry.timestamp === "string"
                  ? entry.timestamp
                  : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
                      entry.timestamp,
                    )}
              </time>
            </div>
            {entry.description && <p className="mt-0.5 text-sm text-muted-foreground">{entry.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}
