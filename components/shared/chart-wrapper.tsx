import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChartWrapperProps {
  title: string;
  description?: string;
  /** Recharts chart element — passed as children, wrapped in ResponsiveContainer. */
  children: ReactNode;
  height?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  action?: ReactNode;
  className?: string;
}

/**
 * Every chart in the app (Recharts bar/line/area/donut/radar/etc.) mounts
 * inside this wrapper so title placement, height, and loading/empty states
 * never drift between modules. Only the inner Recharts element changes.
 */
export function ChartWrapper({
  title,
  description,
  children,
  height = 280,
  isLoading,
  isEmpty,
  action,
  className,
}: ChartWrapperProps) {
  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton style={{ height }} className="w-full rounded-lg" />
        ) : isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState
              icon={BarChart3}
              title="No data yet"
              description="This chart will populate once the board has enough activity to analyze."
              compact
            />
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
