"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { KanbanBoard } from "@/features/kanban/components/kanban-board";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import type { KanbanColumn } from "@/features/kanban/types";

export function KanbanPageContent() {
  const { data, error, loading } = useWorkspace();
  const columns = (data?.workspace.kanban ?? []) as KanbanColumn[];

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Studio" title="Kanban" description="Everything the board flagged as an action item, tracked in one board." />
      <KanbanBoard columns={columns} />
    </div>
  );
}
