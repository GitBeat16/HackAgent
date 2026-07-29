"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, FileSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard } from "@/features/reports/components/report-card";
import { fetchReports } from "@/features/reports/service";
import type { ReportSummary } from "@/features/reports/types";

export function ReportsList() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports()
      .then(setReports)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) => r.startupName.toLowerCase().includes(q) || r.industry.toLowerCase().includes(q) || r.oneLiner.toLowerCase().includes(q),
    );
  }, [query, reports]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by startup, industry, or one-liner…"
        startAdornment={<Search />}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState icon={FileSearch} title="No reports match that search" description="Try a different startup name or industry." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
