"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { MetricCard } from "@/components/shared/metric-card";
import { RevenueExpenseChart } from "@/features/financials/components/revenue-expense-chart";
import { CapTable } from "@/features/financials/components/cap-table";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TrendValue } from "@/types/common";
import type { CapTableRow } from "@/features/financials/types";

type FinancialsData = {
  metrics: Array<{ label: string; value: string; trend: TrendValue }>;
  revenueExpense: Array<{ month: string; revenue: number; expense: number }>;
  capTable: CapTableRow[];
};

export function FinancialsPageContent() {
  const { data, error, loading } = useWorkspace();
  const financials = (data?.workspace.financials ?? {}) as FinancialsData;

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Intelligence"
        title="Financial dashboard"
        description="Unit economics and runway, modeled from the assumptions in your last pitch."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(financials.metrics ?? []).map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} trend={metric.trend} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RevenueExpenseChart data={financials.revenueExpense ?? []} />
        <CapTable rows={financials.capTable ?? []} />
      </div>
    </div>
  );
}
