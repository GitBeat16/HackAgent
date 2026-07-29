import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Raw upstream text, shown collapsed under the human-readable description. */
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Errors state what happened and how to fix it — never "Oops!" or vague
 * apologies. Every ErrorState should offer a retry action where one is
 * meaningful; if it isn't, say what to do instead via `description`.
 */
/**
 * Past this many characters a message is no longer product copy — it is a
 * raw upstream error. Those get a wider measure and tighter padding, so a
 * provider's paragraph does not render as a full-height slab in a layout
 * sized for one sentence.
 */
const LONG_MESSAGE = 120;

export function ErrorState({
  title = "This section didn't load",
  description = "Check your connection and try again. If it keeps happening, the board's data service may be delayed.",
  detail,
  onRetry,
  retryLabel = "Retry",
  compact,
  className,
}: ErrorStateProps) {
  const isLong = description.length > LONG_MESSAGE;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 text-center",
        compact || isLong ? "p-6" : "p-12",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className={cn("text-sm text-muted-foreground", isLong ? "max-w-xl" : "max-w-sm")}>
          {description}
        </p>
      </div>
      {detail && (
        // Collapsed by default: the operator detail matters when debugging
        // and is noise the rest of the time.
        <details className="max-w-xl text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Technical detail
          </summary>
          <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
            {detail}
          </p>
        </details>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="size-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
