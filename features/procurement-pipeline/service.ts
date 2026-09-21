import type { ProposalListResponse, ApproveProposalRequest, RejectProposalRequest } from "@/types/api";

export async function fetchPipelineForChallenge(challengeId: string): Promise<ProposalListResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/proposals`);
  if (!res.ok) throw new Error("Failed to load proposals");
  return res.json();
}

export async function triggerAiEvaluation(proposalId: string) {
  const res = await fetch(`/api/proposals/${proposalId}/evaluate`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to queue AI evaluation");
  return res.json();
}

export async function approveProposal(proposalId: string, body: ApproveProposalRequest) {
  const res = await fetch(`/api/proposals/${proposalId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Failed to approve proposal");
  return res.json();
}
