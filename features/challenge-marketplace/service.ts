import type { ChallengeListResponse, CreateChallengeRequest, CreateProposalRequest } from "@/types/api";

export async function fetchOpenChallenges(): Promise<ChallengeListResponse> {
  const res = await fetch("/api/challenges");
  if (!res.ok) throw new Error("Failed to load challenges");
  return res.json();
}

export async function submitProposal(challengeId: string, body: CreateProposalRequest) {
  const res = await fetch(`/api/challenges/${challengeId}/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Failed to submit proposal");
  return res.json();
}

export async function createChallenge(body: CreateChallengeRequest) {
  const res = await fetch("/api/challenges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Failed to create challenge");
  return res.json();
}
