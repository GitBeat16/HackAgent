"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Check, Download, Share2 } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { MetricCard } from "@/components/shared/metric-card";
import { ScoreCard } from "@/components/shared/score-card";
import { BoardroomRadarChart } from "@/components/shared/radar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SwotGrid } from "@/features/reports/components/swot-grid";
import { RiskMatrix } from "@/features/reports/components/risk-matrix";
import { BoardAnalysis } from "@/features/reports/components/board-analysis";
import { BoardVotes } from "@/features/reports/components/board-votes";
import { fetchReport } from "@/features/reports/service";
import type { ReportDetail } from "@/features/reports/types";

const verdictTone = { "Strong buy": "success", Conditional: "warning", Pass: "destructive" } as const;

export function ReportDetailView({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      // Revert the label rather than leaving a permanent "copied" state,
      // which stops looking like feedback after a few seconds.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied outside a secure context (plain http on a
      // LAN IP, for instance). Falling back to a prompt still lets the user
      // copy the link by hand instead of the button appearing broken.
      window.prompt("Copy this report link:", window.location.href);
    }
  }

  useEffect(() => {
    fetchReport(id)
      .then(setReport)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (report === undefined && !error) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;
  if (!report) notFound();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={report.industry}
        title={report.startupName}
        description={report.oneLiner}
        action={
          // Hidden in the printed PDF — an "Export PDF" button inside the
          // exported PDF is a giveaway that nobody tested the output.
          <div className="flex gap-2" data-print-hide>
            <Button variant="outline" size="sm" onClick={handleShare}>
              {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
              {copied ? "Link copied" : "Share"}
            </Button>
            {/* Print-to-PDF rather than a server-side renderer: the report is
                already a styled document, and the browser's own print pipeline
                produces a selectable, correctly paginated PDF for free. A
                headless-Chrome service would be a lot of infrastructure to
                reproduce what Cmd+P already does. */}
            <Button size="sm" onClick={() => window.print()}>
              <Download className="size-3.5" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="flex flex-col items-center justify-center gap-4 p-6">
          <ScoreCard label="Investment score" score={report.investmentScore} size="lg" tone="brass" />
          <Badge tone={verdictTone[report.verdict]}>{report.verdict}</Badge>
          <p className="text-center text-xs text-muted-foreground">Generated {report.generatedAt}</p>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle className="text-base">Executive summary</CardTitle>
          </CardHeader>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{report.executiveSummary}</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {report.financials.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <BoardroomRadarChart
        title="Evaluation by dimension"
        description="Scored 0–100 by the board across five weighted criteria"
        data={report.dimensions}
        series={[{ key: "score", label: report.startupName }]}
      />

      {/* The individual votes sit directly under the aggregate score they
          explain — a reader who disagrees with the headline number should be
          one scroll from seeing who dissented and why. */}
      <BoardVotes votes={report.votes} />

      <SwotGrid swot={report.swot} />
      <RiskMatrix risks={report.risks} />
      <BoardAnalysis report={report} />
    </div>
  );
}
