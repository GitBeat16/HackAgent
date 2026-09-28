"use client";

import { useEffect, useState } from "react";
import { fetchPipelineForChallenge, triggerAiEvaluation, uploadProposalDocument, PipelineProposal, runEligibilityScreening } from "../service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MilestoneModal } from "./milestone-modal";

export function PipelineBoard({ challengeId }: { challengeId: string }) {
  const [proposals, setProposals] = useState<PipelineProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingProposal, setEvaluatingProposal] = useState<string | null>(null);
  const [approvingProposal, setApprovingProposal] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchPipelineForChallenge(challengeId);
    setProposals(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [challengeId]);

  const handleScreen = async (id: string) => { 
    try { 
      const res = await runEligibilityScreening(id); 
      if (!res.allPassed) {
        alert('Proposal marked ineligible. Rules failed: ' + res.checks.filter((c: { passed: boolean, rule: string }) => !c.passed).map((c: { passed: boolean, rule: string }) => c.rule).join(', '));
      } else {
        alert('Eligibility checks passed.');
      }
      load(); 
    } catch (e) { 
      alert('Screening failed'); 
    } 
  };

  const handleEvaluate = async (id: string) => {
    setEvaluatingProposal(id);
    try {
      await triggerAiEvaluation(id);
      load();
    } catch (e: unknown) {
      alert("Evaluation failed: " + String((e as Record<string, unknown>).message));
    } finally {
      setEvaluatingProposal(null);
    }
  };

  const columns = ["submitted", "screened", "evaluating", "evaluated", "pilot_active"];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(status => (
        <div key={status} className="flex-shrink-0 w-80 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold capitalize">{status.replace('_', ' ')}</h3>
            <Badge tone="muted">{proposals.filter(p => p.status === status).length}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {proposals.filter(p => p.status === status).map(proposal => (
              <Card key={proposal.id} className="border-border/50">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-sm">{proposal.profiles?.startup_name}</h4>
                    <span className="text-xs text-muted-foreground">{new Date(proposal.submitted_at).toLocaleDateString()}</span>
                  </div>

                  {proposal.ai_match_score !== null && (
                    <div className="text-xs bg-primary/10 text-primary p-2 rounded">
                      AI Score: <span className="font-bold">{proposal.ai_match_score}/100</span>
                    </div>
                  )}

                  {status === 'submitted' && (
                    <Button size="sm" className="w-full" onClick={() => handleScreen(proposal.id)}>
                      Screen Eligibility
                    </Button>
                  )}

                  {status === 'screened' && (
                    <Button size="sm" className="w-full" onClick={() => handleEvaluate(proposal.id)} disabled={evaluatingProposal === proposal.id}>
                      {evaluatingProposal === proposal.id ? 'Evaluating (may take a minute)...' : 'Run AI Evaluation'}
                    </Button>
                  )}

                  {status === 'evaluated' && (
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => setApprovingProposal(proposal.id)}>
                      Approve Pilot
                    </Button>
                  )}

                  {status === 'pilot_active' && proposal.milestones && (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      <h4 className="font-semibold text-sm">Milestones</h4>
                      {proposal.milestones.map((m: { id: string, title: string, description: string, status: string, payment_status: string, payment_inr: number }) => (
                        <div key={m.id} className="text-xs border p-2 rounded bg-surface space-y-2">
                          <div className="flex justify-between font-medium">
                            <span>{m.title}</span>
                            <Badge tone="outline" className="text-[10px]">{m.status}</Badge>
                          </div>
                          
                          {/* Officer action to approve once validated */}
                          {m.status === 'validated' && (
                            <Button size="sm" className="w-full h-7 text-xs" onClick={async () => {
                              try {
                                await fetch(`/api/milestones/${m.id}/approve`, { method: 'POST' });
                                load();
                              } catch (e) {
                                alert("Failed to approve");
                              }
                            }}>Approve Milestone</Button>
                          )}
                          
                          {/* Officer action to release payment once approved */}
                          {m.status === 'approved' && m.payment_status === 'pending' && (
                            <Button size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                              try {
                                await fetch(`/api/milestones/${m.id}/payment`, { 
                                  method: 'POST', 
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'release' })
                                });
                                load();
                              } catch (e) {
                                alert("Failed to release payment");
                              }
                            }}>Release Payment (?{m.payment_inr})</Button>
                          )}

                          {m.payment_status === 'released' && <div className="text-emerald-600 font-medium">Payment Released</div>}
                          {m.payment_status === 'paid' && <div className="text-emerald-600 font-medium">Paid</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      
      {approvingProposal && (
        <MilestoneModal 
          proposalId={approvingProposal} 
          onComplete={() => { setApprovingProposal(null); load(); }} onCancel={() => setApprovingProposal(null)} 
        />
      )}
    </div>
  );
}
