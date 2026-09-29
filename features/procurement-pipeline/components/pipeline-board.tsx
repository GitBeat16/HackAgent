"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPipelineForChallenge,
  triggerAiEvaluation,
  runEligibilityScreening,
  PipelineProposal,
} from "../service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MilestoneModal } from "./milestone-modal";
import { getErrorMessage } from "@/lib/server/errors";

type EvalStatus = "idle" | "queuing" | "running" | "done" | "error";

export function PipelineBoard({ challengeId }: { challengeId: string }) {
  const [proposals, setProposals] = useState<PipelineProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [evalState, setEvalState] = useState<Record<string, { status: EvalStatus; message?: string }>>({});
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [approvingProposal, setApprovingProposal] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const data = await fetchPipelineForChallenge(challengeId);
    setProposals(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  function setEval(id: string, status: EvalStatus, message?: string) {
    setEvalState(prev => ({ ...prev, [id]: { status, message } }));
  }

  const handleScreen = async (id: string) => {
    setScreeningId(id);
    setInlineError(prev => ({ ...prev, [id]: "" }));
    try {
      const res = await runEligibilityScreening(id);
      if (!res.allPassed) {
        const failed = res.checks
          .filter((c: { passed: boolean; rule_name: string }) => !c.passed)
          .map((c: { passed: boolean; rule_name: string }) => c.rule_name)
          .join(", ");
        setInlineError(prev => ({ ...prev, [id]: `Ineligible — failed: ${failed}` }));
      }
      load();
    } catch (e) {
      setInlineError(prev => ({ ...prev, [id]: getErrorMessage(e) }));
    } finally {
      setScreeningId(null);
    }
  };

  const handleEvaluate = async (id: string) => {
    setEval(id, "queuing");
    try {
      // Step 1: Queue — marks proposal as evaluating, creates meeting
      const { meetingId } = await triggerAiEvaluation(id);
      if (!meetingId) throw new Error("No meetingId returned from evaluate");

      // Step 2: Run — executes the 10-turn debate, writes score + report_id back
      setEval(id, "running");
      const res = await fetch(`/api/proposals/${id}/evaluate/run`, { method: "POST" });
      const body = (await res.json()) as { success?: boolean; verdict?: string; score?: number; error?: string };

      if (!res.ok) throw new Error(body.error ?? `Run failed with status ${res.status}`);

      setEval(id, "done", `✓ ${body.verdict} — Score: ${body.score}`);
      load();
    } catch (e) {
      setEval(id, "error", getErrorMessage(e));
    }
  };

  const handleMilestoneApprove = async (milestoneId: string, proposalId: string) => {
    setInlineError(prev => ({ ...prev, [milestoneId]: "" }));
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Approve failed");
      }
      load();
    } catch (e) {
      setInlineError(prev => ({ ...prev, [milestoneId]: getErrorMessage(e) }));
    }
  };

  const handlePaymentRelease = async (milestoneId: string) => {
    setInlineError(prev => ({ ...prev, [milestoneId]: "" }));
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release" }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Payment release failed");
      }
      load();
    } catch (e) {
      setInlineError(prev => ({ ...prev, [milestoneId]: getErrorMessage(e) }));
    }
  };

  const columns = ["submitted", "screened", "evaluating", "evaluated", "pilot_active"];

  if (loading && proposals.length === 0) {
    return <div className="text-sm text-muted-foreground">Loading pipeline…</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(status => (
        <div key={status} className="flex-shrink-0 w-80 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold capitalize text-sm">{status.replace(/_/g, " ")}</h3>
            <Badge tone="muted">{proposals.filter(p => p.status === status).length}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {proposals.filter(p => p.status === status).map(proposal => {
              const es = evalState[proposal.id];
              return (
                <Card key={proposal.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="font-medium text-sm">{proposal.profiles?.startup_name ?? "—"}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(proposal.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    {proposal.ai_match_score !== null && (
                      <div className="flex items-center justify-between bg-primary/10 text-primary p-2 rounded">
                        <div className="text-xs">
                          AI Score: <span className="font-bold">{proposal.ai_match_score}/100</span>
                        </div>
                        <Link href={`/proposals/${proposal.id}/report`} className="text-xs hover:underline inline-flex items-center">
                          View Report &rarr;
                        </Link>
                      </div>
                    )}

                    {/* Inline error */}
                    {inlineError[proposal.id] && (
                      <p className="text-xs text-destructive">{inlineError[proposal.id]}</p>
                    )}

                    {/* Eval status feedback */}
                    {es && es.status !== "idle" && (
                      <p className={`text-xs ${es.status === "error" ? "text-destructive" : es.status === "done" ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {es.status === "queuing" && "Queueing evaluation…"}
                        {es.status === "running" && "Running AI debate (5 personas, ~60s)…"}
                        {(es.status === "done" || es.status === "error") && es.message}
                      </p>
                    )}

                    {proposal.eligibility_checks && proposal.eligibility_checks.length > 0 && (
                      <div className="space-y-1 text-xs border rounded p-2 bg-muted/20">
                        <div className="font-semibold mb-1">Eligibility Checklist</div>
                        {proposal.eligibility_checks.map((chk, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[10px] uppercase text-muted-foreground">{chk.rule_name}</span>
                              <span className={chk.passed ? "text-emerald-500 font-bold" : "text-destructive font-bold"}>
                                {chk.passed ? "PASS" : "FAIL"}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{chk.reason}</span>
                              {chk.rule_name.includes("DPIIT") && (
                                <span className="text-[9px] text-blue-500/80 leading-tight">Format validated locally - live registry integration not yet connected</span>
                              )}
                            </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {status === "submitted" && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleScreen(proposal.id)}
                        disabled={screeningId === proposal.id}
                      >
                        {screeningId === proposal.id ? "Screening…" : "Screen Eligibility"}
                      </Button>
                    )}

                    {status === "screened" && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleEvaluate(proposal.id)}
                        disabled={!!es && es.status !== "idle" && es.status !== "error"}
                      >
                        {!es || es.status === "idle" || es.status === "error"
                          ? "Run AI Evaluation"
                          : es.status === "queuing"
                          ? "Queueing…"
                          : "Running debate…"}
                      </Button>
                    )}

                    {status === "evaluated" && (
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setApprovingProposal(proposal.id)}
                      >
                        Approve Pilot
                      </Button>
                    )}

                    {status === "pilot_active" && proposal.milestones && (
                      <div className="space-y-3 pt-3 border-t">
                        <h4 className="font-semibold text-xs uppercase text-muted-foreground">Milestones</h4>
                        {proposal.milestones.map((m: {
                          id: string;
                          title: string;
                          status: string;
                          payment_status: string;
                          payment_inr: number;
                          is_on_time?: boolean;
                          days_to_payment?: number;
                        }) => (
                          <div key={m.id} className="text-xs border p-2 rounded bg-surface space-y-2">
                            <div className="flex justify-between font-medium">
                              <span>{m.title}</span>
                              <Badge tone="outline" className="text-[10px]">{m.status}</Badge>
                            </div>

                            {inlineError[m.id] && (
                              <p className="text-destructive">{inlineError[m.id]}</p>
                            )}

                            {m.status === "validated" && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={() => handleMilestoneApprove(m.id, proposal.id)}
                              >
                                Approve Milestone
                              </Button>
                            )}

                            {m.status === "approved" && m.payment_status === "unpaid" && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handlePaymentRelease(m.id)}
                              >
                                Release Payment (₹{m.payment_inr.toLocaleString("en-IN")})
                              </Button>
                            )}

                            {m.payment_status === "processing" && (
                              <div className="text-amber-500 font-medium">Payment Processing</div>
                            )}
                            {m.payment_status === "paid" && (
                              <div className="flex flex-col">
                                <div className="text-emerald-600 font-medium">Paid ✓</div>
                                {m.is_on_time !== undefined && m.is_on_time !== null && (
                                  <div className={`text-[10px] font-bold ${m.is_on_time ? 'text-emerald-500' : 'text-destructive'}`}>
                                    {m.is_on_time ? `ON-TIME (${m.days_to_payment} days)` : `LATE (${m.days_to_payment} days)`}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {approvingProposal && (
        <MilestoneModal
          proposalId={approvingProposal}
          onComplete={() => { setApprovingProposal(null); load(); }}
          onCancel={() => setApprovingProposal(null)}
        />
      )}
    </div>
  );
}
