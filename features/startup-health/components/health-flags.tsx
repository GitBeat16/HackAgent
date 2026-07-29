import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HealthFlag } from "@/features/startup-health/types";

const severityConfig: Record<HealthFlag["severity"], { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-signal bg-signal/10 border-signal/30" },
  warning: { icon: AlertTriangle, className: "text-warning bg-warning/10 border-warning/30" },
  critical: { icon: ShieldAlert, className: "text-destructive bg-destructive/10 border-destructive/30" },
};

export function HealthFlags({ flags }: { flags: HealthFlag[] }) {
  if (flags.length === 0) {
    return <p className="text-sm text-muted-foreground">No flags raised — run a board session to populate this.</p>;
  }

  return (
    <div className="space-y-3">
      {flags.map((flag) => {
        // Fall back rather than destructure undefined if a severity is unknown.
        const { icon: Icon, className } = severityConfig[flag.severity] ?? severityConfig.info;
        return (
          <Card key={flag.id} className="flex gap-4 p-4">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", className)}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{flag.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{flag.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
