"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DeckViewer } from "@/features/pitch-deck/components/deck-viewer";
import { useWorkspace } from "@/hooks/use-workspace";
import type { DeckSlide } from "@/features/pitch-deck/types";

export function PitchDeckContent() {
  const { data, error, loading } = useWorkspace();
  const slides = (data?.workspace.pitchDeck ?? []) as DeckSlide[];

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Studio"
        title="Pitch deck"
        description="Restructured around what the board actually asked, not just your original outline."
      />
      <DeckViewer deckSlides={slides} />
    </div>
  );
}
