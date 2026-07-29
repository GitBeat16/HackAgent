"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/shared/section-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/shared/timeline";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHistory } from "@/features/history/service";
import type { VersionEntry } from "@/features/history/types";

export function HistoryContent() {
  const [entries, setEntries] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(setEntries)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <>
      <Card className="p-6">
        <Timeline
          entries={entries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            description: entry.description,
            timestamp: entry.timestamp,
            tone: entry.tone,
          }))}
        />
      </Card>
      <div className="flex flex-wrap gap-2">
        {["Report", "Pitch deck", "PRD", "Financials"].map((type) => (
          <Badge key={type} tone="outline">
            {type}
          </Badge>
        ))}
      </div>
    </>
  );
}

export function HistoryPageContent() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Studio"
        title="Version history"
        description="Every regenerated report, deck, and spec — nothing overwrites silently."
      />
      <HistoryContent />
    </div>
  );
}
