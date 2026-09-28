import { createClient } from "@/lib/supabase/client";

export interface PipelineProposal {
  id: string;
  startup_id: string;
  status: string;
  ai_match_score: number | null;
  submitted_at: string;
  profiles: {
    startup_name: string;
  };
  milestones?: { id: string, title: string, description: string, status: string, payment_status: string, payment_inr: number }[];
}

export async function fetchPipelineForChallenge(challengeId: string): Promise<PipelineProposal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('procurement_proposals')
    .select('id, startup_id, status, ai_match_score, submitted_at, profiles(startup_name), milestones(*)')
    .eq('challenge_id', challengeId);
    
  if (error) {
    console.error("Pipeline fetch error:", error);
    throw new Error(error.message);
  }
  return data as unknown as PipelineProposal[];
}

export async function uploadProposalDocument(proposalId: string, file: File, documentType: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  formData.append('documentTitle', file.name);

  const res = await fetch(`/api/proposals/${proposalId}/document`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function triggerAiEvaluation(proposalId: string): Promise<{ success: boolean; meetingId: string }> {
  const res = await fetch(`/api/proposals/${proposalId}/evaluate`, { method: 'POST' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to trigger evaluation");
  }
  return res.json() as Promise<{ success: boolean; meetingId: string }>;
}



export async function approveProposalWithMilestones(
  proposalId: string, 
  milestones: Array<{title: string, description: string, paymentInr: number, dueDate?: string}>,
  pilotPlan: { durationWeeks: number, scopeDescription: string, constraints: string, kpis: Array<{name: string, unit: string, baseline: number, target: number}> },
  overrideReason?: string
) {
  const res = await fetch(`/api/proposals/${proposalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestones, pilotPlan, overrideReason })
  });
  if (!res.ok) throw new Error("Failed to approve proposal");
  return res.json();
}


export async function runEligibilityScreening(proposalId: string) {
  const res = await fetch(`/api/proposals/${proposalId}/screen`, { method: 'POST' });
  if (!res.ok) throw new Error("Failed to screen proposal");
  return res.json();
}


