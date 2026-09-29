import { createClient } from "@/lib/supabase/server";

export async function buildProcurementPackage(proposalId: string) {
  const supabase = await createClient();

  const { data: proposal, error } = await supabase
    .from("procurement_proposals")
    .select(`
      *,
      challenges(*),
      pilot_plans(
        *,
        pilot_kpis(*)
      ),
      milestones(*),
      scale_decisions(*)
    `)
    .eq("id", proposalId)
    .single();

  if (error || !proposal) {
    throw new Error("Proposal not found");
  }

  // Format into a clean JSON structure
  const plan = (proposal.pilot_plans && proposal.pilot_plans.length > 0) ? proposal.pilot_plans[0] : null;

  const pkg = {
    challenge: {
      title: proposal.challenges?.title,
      department: proposal.challenges?.department_id,
      budget: proposal.challenges?.budget_inr
    },
    proposal: {
      status: proposal.status,
      ai_score: proposal.ai_match_score,
      officer_override_reason: proposal.officer_override_reason || null
    },
    pilot: plan ? {
      duration_weeks: plan.duration_weeks,
      scope: plan.scope,
      kpis: (plan.pilot_kpis || []).map((kpi: { name: string; baseline: number; target: number; actual: number | null; unit: string; }) => ({
        name: kpi.name,
        baseline: kpi.baseline,
        target: kpi.target,
        actual: kpi.actual,
        unit: kpi.unit
      }))
    } : null,
    milestones: (proposal.milestones || []).map((m: { title: string; status: string; payment_status: string; is_on_time: boolean | null; }) => ({
      title: m.title,
      status: m.status,
      payment_status: m.payment_status,
      is_on_time: m.is_on_time
    })),
    scale_decision: (proposal.scale_decisions && proposal.scale_decisions.length > 0) ? {
      decision: proposal.scale_decisions[0].decision,
      pathway: proposal.scale_decisions[0].pathway,
      reason: proposal.scale_decisions[0].reason
    } : null
  };

  return pkg;
}
