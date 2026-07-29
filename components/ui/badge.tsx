import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none [&_svg]:size-3",
  {
    variants: {
      tone: {
        brass: "border-primary/30 bg-primary/15 text-primary",
        signal: "border-signal/30 bg-signal/15 text-signal",
        success: "border-success/30 bg-success/15 text-success",
        warning: "border-warning/30 bg-warning/15 text-warning",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive",
        muted: "border-border bg-muted text-muted-foreground",
        outline: "border-border-strong bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      tone: "muted",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Renders a small pulsing dot before the label — for "live" states. */
  pulse?: boolean;
}

function Badge({ className, tone, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, className }))} {...props}>
      {pulse && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-current" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
