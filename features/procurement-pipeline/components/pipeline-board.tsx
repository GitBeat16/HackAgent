"use client";

import React, { useEffect, useState } from "react";
import { fetchPipelineForChallenge, triggerAiEvaluation } from "../service";
import type { PipelineProposal } from "../types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COLUMNS = ["submitted", "evaluating", "evaluated", "approved", "pilot_active", "completed"];

export function PipelineBoard({ challengeId }: { challengeId: string }) {
  const [proposals, setProposals] = useState<PipelineProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchPipelineForChallenge(challengeId)
      .then(data => setProposals(data.proposals || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [challengeId]);

  const handleEvaluate = async (id: string) => {
    if (!confirm("Run HackAgent AI evaluation on this proposal?")) return;
    await triggerAiEvaluation(id);
    load();
  };

  if (loading) return <div className="p-8 text-center">Loading Pipeline...</div>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-12rem)]">
      {COLUMNS.map(col => (
        <div key={col} className="w-80 flex-shrink-0 bg-muted/50 rounded-xl p-4 flex flex-col">
          <h3 className="font-semibold uppercase tracking-wider text-xs mb-4 text-muted-foreground">
            {col.replace("_", " ")}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {proposals.filter(p => p.status === col).map(p => (
              <Card key={p.id} className="cursor-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Startup {p.startupId.substring(0,8)}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pb-2">
                  Submitted: {new Date(p.submittedAt).toLocaleDateString()}
                  {p.aiMatchScore !== undefined && (
                    <div className="mt-2 font-bold text-primary">
                      AI Score: {p.aiMatchScore}/100
                    </div>
                  )}
                </CardContent>
                {col === "submitted" && (
                  <CardFooter className="pt-0">
                    <Button size="sm" className="w-full text-xs" onClick={() => handleEvaluate(p.id)}>Run AI Evaluation</Button>
                  </CardFooter>
                )}
                {col === "evaluated" && (
                  <CardFooter className="pt-0 gap-2">
                    <Button size="sm" variant="outline" className="w-full text-xs bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Approve</Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
