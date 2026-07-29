"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketSizeChart } from "@/features/market-research/components/market-size-chart";
import { MarketTrendChart } from "@/features/market-research/components/market-trend-chart";
import { CompetitorMatrix } from "@/features/market-research/components/competitor-matrix";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Competitor, MarketSizeSlice, TrendPoint } from "@/features/market-research/types";

type MarketResearchData = {
  marketSizing?: MarketSizeSlice[];
  competitors?: Competitor[];
  marketTrend?: TrendPoint[];
};

export function MarketResearchContent() {
  const { data, error, loading } = useWorkspace();
  const research = (data?.workspace.marketResearch ?? {}) as MarketResearchData;

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Intelligence"
        title="Market research"
        description="Sizing, growth, and competitors, cross-checked by the Research Agent against independent sources."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketSizeChart data={research.marketSizing ?? []} />
        <MarketTrendChart data={research.marketTrend ?? []} />
      </div>
      <CompetitorMatrix competitors={research.competitors ?? []} />
    </div>
  );
}
