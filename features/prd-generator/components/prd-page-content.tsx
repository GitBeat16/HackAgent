"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PrdViewer } from "@/features/prd-generator/components/prd-viewer";
import { useWorkspace } from "@/hooks/use-workspace";
import type { PrdSection } from "@/features/prd-generator/types";

export function PrdPageContent() {
  const { data, error, loading } = useWorkspace();
  const sections = (data?.workspace.prdDocument ?? []) as PrdSection[];

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Studio"
        title="PRD generator"
        description="A build-ready spec for whatever the board flagged as the highest-leverage fix."
      />
      <PrdViewer sections={sections} subject={data?.profile.workspaceName ?? undefined} />
    </div>
  );
}
