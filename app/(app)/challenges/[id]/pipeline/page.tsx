import React from 'react';
import { PipelineBoard } from '@/features/procurement-pipeline/components/pipeline-board';

export default function PipelinePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8 h-screen flex flex-col overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Procurement Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Review startup proposals and track active pilots.
        </p>
      </div>
      <PipelineBoard challengeId={params.id} />
    </div>
  );
}
