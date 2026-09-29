import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "./audit";
import { PAYMENT_SLA_DAYS } from "./constants";

export class ProcurementError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProcurementError';
  }
}

// department_id stores the creating officer's user ID (auth.users.id), not a separate department entity — there is no departments table.
function getChallengeDeptId(challenges: unknown): string | undefined {
  if (Array.isArray(challenges)) return challenges[0]?.department_id;
  return (challenges as { department_id?: string })?.department_id;
}

function getChallengeConfig(challenges: unknown): { entity_age_max?: number, relax_turnover?: boolean } {
  const challenge = Array.isArray(challenges) ? challenges[0] : challenges;
  const casted = challenge as { entity_age_max?: number, relax_turnover?: boolean };
  return { entity_age_max: casted?.entity_age_max, relax_turnover: casted?.relax_turnover };
}

function getProposalStartupId(proposals: unknown): string | undefined {
  if (Array.isArray(proposals)) return proposals[0]?.startup_id;
  return (proposals as { startup_id?: string })?.startup_id;
}

function getProposalDeptId(proposals: unknown): string | undefined {
  const proposal = Array.isArray(proposals) ? proposals[0] : proposals;
  return getChallengeDeptId((proposal as { challenges?: unknown })?.challenges);
}

const PROPOSAL_TRANSITIONS: Record<string, Record<string, string[]>> = {
  submitted: { department_officer: ['evaluating', 'screened', 'ineligible'] },
  screened: { department_officer: ['evaluating'] },
  evaluating: { department_officer: ['evaluated'] },
  evaluated: { department_officer: ['pilot_approved', 'rejected'] },
  pilot_approved: { startup: ['pilot_active'], department_officer: ['pilot_active'] },
  pilot_active: { department_officer: ['pilot_complete', 'terminated'] },
  pilot_complete: { department_officer: ['scaled', 'extended', 'terminated'] }
};

const MILESTONE_TRANSITIONS: Record<string, Record<string, string[]>> = {
  pending: { startup: ['evidence_submitted'] },
  evidence_submitted: { validator: ['validated', 'rejected'] },
  rejected: { startup: ['evidence_submitted'] },
  validated: { department_officer: ['approved'] }
};

function assertTransition(type: 'proposal' | 'milestone', current: string, target: string, role: string) {
  const map = type === 'proposal' ? PROPOSAL_TRANSITIONS : MILESTONE_TRANSITIONS;
  const allowedTargets = map[current]?.[role] || [];
  if (!allowedTargets.includes(target)) {
    throw new ProcurementError(`Invalid transition for ${role}: cannot move ${type} from ${current} to ${target}.`, 'INVALID_TRANSITION');
  }
}

// ---------------- CHALLENGES ----------------

export async function createChallenge(
  departmentId: string,
  input: { title: string; description: string; domain: string; budgetInr?: number; deadline?: string }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      department_id: departmentId,
      title: input.title,
      description: input.description,
      domain: input.domain,
      budget_inr: input.budgetInr,
      deadline: input.deadline,
      status: 'open' 
    })
    .select('id')
    .single();

  if (error || !data) throw new ProcurementError(error?.message || "Failed to create", "DB_ERROR");
  
  await writeAuditLog(departmentId, 'department_officer', 'challenge', data.id, 'created', null, { status: 'open' });
  return data.id;
}

// ---------------- PROPOSALS ----------------

export async function submitProposal(
  startupId: string,
  challengeId: string,
  proposalText: string
) {
  const supabase = await createClient();
  
  const { data: challenge } = await supabase.from('challenges').select('status').eq('id', challengeId).single();
  if (!challenge || challenge.status !== 'open') {
    throw new ProcurementError("Challenge is not open.", "INVALID_CHALLENGE");
  }

  const { data, error } = await supabase
    .from('procurement_proposals')
    .insert({
      challenge_id: challengeId,
      startup_id: startupId,
      proposal_text: proposalText,
      status: 'submitted'
    })
    .select('id')
    .single();

  if (error || !data) throw new ProcurementError(error?.message || "Failed to submit", "DB_ERROR");

  await writeAuditLog(startupId, 'startup_founder', 'proposal', data.id, 'submitted', null, { status: 'submitted' });
  return data.id;
}

// ---------------- DOCUMENTS ----------------

export async function uploadAuxiliaryDocument(
  officerId: string,
  proposalId: string,
  documentTitle: string,
  documentType: string,
  storagePath: string
) {
  const supabase = await createClient();

  const { data: proposal } = (await supabase
    .from('procurement_proposals')
    .select('id, challenge_id, challenges!inner(department_id)')
    .eq('id', proposalId)
    .single()) as { data: { id: string; challenge_id: string; challenges: { department_id: string } | { department_id: string }[] } | null };

  const deptId = Array.isArray(proposal?.challenges) ? proposal?.challenges[0]?.department_id : (proposal?.challenges as { department_id: string })?.department_id;

  if (!proposal || deptId !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  const { data, error } = await supabase
    .from('proposal_documents')
    .insert({
      proposal_id: proposalId,
      uploaded_by: officerId,
      document_title: documentTitle,
      document_type: documentType,
      storage_path: storagePath
    })
    .select('id')
    .single();

  if (error || !data) throw new ProcurementError(error?.message || "Failed to save document", "DB_ERROR");
  
  await writeAuditLog(officerId, 'department_officer', 'document', data.id, 'uploaded', null, { type: documentType });
  return data.id;
}

// ---------------- EVALUATION PIPELINE ----------------

export async function queueAiEvaluation(officerId: string, proposalId: string, meetingId?: string) {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from('procurement_proposals')
    .select('status, challenges!inner(department_id)')
    .eq('id', proposalId)
    .single();

  if (!proposal || getChallengeDeptId(proposal.challenges) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('proposal', proposal.status, 'evaluating', 'department_officer');

  const { error } = await supabase.from('procurement_proposals').update({ status: 'evaluating', ...(meetingId ? { meeting_id: meetingId } : {}) }).eq('id', proposalId);
  if (error) throw new ProcurementError("DB Error", "DB_ERROR");

  await writeAuditLog(officerId, 'department_officer', 'proposal', proposalId, 'status_changed', { status: proposal.status }, { status: 'evaluating' });
}

export async function recordEvaluationResult(officerId: string, proposalId: string, reportId: string, score: number) {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from('procurement_proposals')
    .select('status, challenges!inner(department_id)')
    .eq('id', proposalId)
    .single();

  if (!proposal || getChallengeDeptId(proposal.challenges) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('proposal', proposal.status, 'evaluated', 'department_officer');

  const { error } = await supabase
    .from('procurement_proposals')
    .update({ 
      status: 'evaluated', 
      ai_match_score: score, 
      report_id: reportId,
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId);

  if (error) throw new ProcurementError("DB Error", "DB_ERROR");
  await writeAuditLog(officerId, 'department_officer', 'proposal', proposalId, 'status_changed', { status: proposal.status }, { status: 'evaluated', score, reportId });
}

export async function approveProposalWithMilestones(
  officerId: string, 
  proposalId: string, 
  milestones: Array<{title: string, description: string, paymentInr: number, dueDate?: string}>,
  pilotPlan: { durationWeeks: number, scopeDescription: string, constraints: string, kpis: Array<{name: string, unit: string, baseline: number, target: number}> },
  overrideReason?: string
) {
  const supabase = await createClient();
  
  const { data: proposal } = await supabase
    .from('procurement_proposals')
    .select('status, report_id, challenges!inner(department_id)')
    .eq('id', proposalId)
    .single();

  if (!proposal || getChallengeDeptId(proposal.challenges) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('proposal', proposal.status, 'pilot_approved', 'department_officer');

  if (proposal.report_id) {
    const { data: report } = await supabase.from('reports').select('verdict').eq('id', proposal.report_id).single();
    if (report && report.verdict === 'Reject' && (!overrideReason || overrideReason.trim().length === 0)) {
      throw new ProcurementError("Override reason is mandatory when approving a proposal that the AI Panel rejected.", "VALIDATION_FAILED");
    }
    if (report && report.verdict === 'Conditional Pilot' && (!overrideReason || overrideReason.trim().length === 0)) {
      throw new ProcurementError("Override reason is mandatory to explain how the AI Panel's conditions are being met.", "VALIDATION_FAILED");
    }
  }

  const { error: pErr } = await supabase
    .from('procurement_proposals')
    .update({ 
      status: 'pilot_approved', 
      officer_override_reason: overrideReason || null,
      decision_by: officerId,
      updated_at: new Date().toISOString() 
    })
    .eq('id', proposalId);

  if (pErr) throw new ProcurementError("DB Error on proposal", "DB_ERROR");

  const { data: plan, error: planErr } = await supabase
    .from('pilot_plans')
    .insert({
      proposal_id: proposalId,
      duration_weeks: pilotPlan.durationWeeks,
      scope: pilotPlan.scopeDescription,
      constraints: pilotPlan.constraints,
      created_by: officerId
    })
    .select('id')
    .single();

  if (planErr || !plan) throw new ProcurementError("Failed to create pilot plan", "DB_ERROR");

  if (pilotPlan.kpis.length > 0) {
    await supabase.from('pilot_kpis').insert(
      pilotPlan.kpis.map(k => ({
        pilot_plan_id: plan.id,
        name: k.name,
        unit: k.unit,
        baseline_value: k.baseline,
        target_value: k.target
      }))
    );
  }

  if (milestones.length > 0) {
    await supabase.from('milestones').insert(
      milestones.map((m, idx) => ({
        proposal_id: proposalId,
        title: m.title,
        description: m.description,
        order_index: idx + 1,
        payment_inr: m.paymentInr,
        due_date: m.dueDate,
        status: 'pending',
        payment_status: 'unpaid'
      }))
    );
  }

  await writeAuditLog(officerId, 'department_officer', 'proposal', proposalId, 'status_changed', { status: proposal.status }, { status: 'pilot_approved' });
}

export async function rejectProposal(officerId: string, proposalId: string, reason: string) {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from('procurement_proposals')
    .select('status, report_id, challenges!inner(department_id)')
    .eq('id', proposalId)
    .single();

  if (!proposal || getChallengeDeptId(proposal.challenges) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('proposal', proposal.status, 'rejected', 'department_officer');

  if (proposal.report_id) {
    const { data: report } = await supabase.from('reports').select('verdict').eq('id', proposal.report_id).single();
    if (report && report.verdict === 'Recommend Pilot' && (!reason || reason.trim().length === 0)) {
      throw new ProcurementError("Override reason is mandatory when rejecting a proposal that the AI Panel recommended.", "VALIDATION_FAILED");
    }
    // If AI rejected or conditional, and officer rejects, they agree, so reason is optional.
  } else if (!reason || reason.trim().length === 0) {
    throw new ProcurementError("Rejection reason is mandatory.", "VALIDATION_FAILED");
  }

  const { error } = await supabase
    .from('procurement_proposals')
    .update({ 
      status: 'rejected',
      rejection_reason: reason || null,
      officer_override_reason: reason || null,
      decision_by: officerId,
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId);

  if (error) throw new ProcurementError("DB Error on reject", "DB_ERROR");
  await writeAuditLog(officerId, 'department_officer', 'proposal', proposalId, 'status_changed', { status: proposal.status }, { status: 'rejected' });
}

export async function runEligibilityScreening(officerId: string, proposalId: string) {
  const supabase = await createClient();
  
  const { data: proposal } = await supabase
    .from('procurement_proposals')
    .select(`
      status, 
      startup_id,
      data_protection_accepted,
      challenges!inner(department_id, entity_age_max, relax_turnover),
      proposal_documents(id)
    `)
    .eq('id', proposalId)
    .single();

  if (!proposal || getChallengeDeptId(proposal.challenges) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('proposal', proposal.status, 'screened', 'department_officer');

  const { data: profile } = await supabase
    .from('startup_profiles')
    .select('dpiit_number, incorporation_date, meets_turnover_threshold')
    .eq('user_id', proposal.startup_id)
    .single();

  const checks: Array<{proposal_id: string; rule_name: string; passed: boolean; reason: string}> = [];
  
  // Rule 1: DPIIT format
  // DPIIT number format is UNVERIFIED — based on common convention, not confirmed against official documentation. Confirm actual format before relying on this in a real deployment.
  const dpiitFormat = /^DIPP\d{1,6}$/i;
  const dpiitValid = !!profile?.dpiit_number && dpiitFormat.test(profile.dpiit_number);
  checks.push({
    proposal_id: proposalId,
    rule_name: 'DPIIT Recognition Format',
    passed: dpiitValid,
    reason: dpiitValid ? 'Valid DIPP format' : 'Invalid or missing DPIIT number'
  });

  // Rule 2: Entity Age
  const config = getChallengeConfig(proposal.challenges);
  const challengeAgeMax = config.entity_age_max || 10;
  const relaxTurnover = config.relax_turnover;
  let ageValid = false;
  let ageReason = 'Missing incorporation date';
  if (relaxTurnover) {
    ageValid = true;
    ageReason = 'Waived (Relaxation active)';
  } else if (profile?.incorporation_date) {
    const incDate = new Date(profile.incorporation_date);
    const ageYears = (new Date().getTime() - incDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears <= challengeAgeMax) {
      ageValid = true;
      ageReason = `Within ${challengeAgeMax} years limit (${Math.floor(ageYears)} yrs)`;
    } else {
      ageReason = `Exceeds ${challengeAgeMax} years limit (${Math.floor(ageYears)} yrs)`;
    }
  }
  checks.push({
    proposal_id: proposalId,
    rule_name: 'Entity Age',
    passed: ageValid,
    reason: ageReason
  });

  // Rule 3: Turnover / Experience threshold
  const turnoverValid = relaxTurnover || !!profile?.meets_turnover_threshold;
  checks.push({
    proposal_id: proposalId,
    rule_name: 'Turnover / Experience',
    passed: turnoverValid,
    reason: relaxTurnover ? 'Waived for startups' : (turnoverValid ? 'Meets threshold' : 'Does not meet standard threshold')
  });

  // Rule 4: Required documents
  const hasDocs = Array.isArray(proposal.proposal_documents) && proposal.proposal_documents.length > 0;
  checks.push({
    proposal_id: proposalId,
    rule_name: 'Required Documents',
    passed: hasDocs,
    reason: hasDocs ? `${proposal.proposal_documents.length} document(s) uploaded` : 'No documents uploaded'
  });

  // Rule 5: Data Protection Declaration
  const dpAccepted = !!proposal.data_protection_accepted;
  checks.push({
    proposal_id: proposalId,
    rule_name: 'Data Protection Declaration',
    passed: dpAccepted,
    reason: dpAccepted ? 'Accepted at submission' : 'Not accepted'
  });

  const allPassed = checks.every(c => c.passed);
  const newStatus = allPassed ? 'screened' : 'ineligible';

  // Write all checks to DB
  await supabase.from('eligibility_checks').insert(checks);
  await supabase.from('procurement_proposals').update({ status: newStatus }).eq('id', proposalId);
  
  await writeAuditLog(officerId, 'department_officer', 'proposal', proposalId, 'status_changed', { status: 'submitted' }, { status: newStatus });
  return { allPassed, checks };
}

// ---------------- POST-APPROVAL PIPELINE ----------------

export async function uploadMilestoneEvidence(startupId: string, milestoneId: string, documentTitle: string, storagePath: string) {
  const supabase = await createClient();
  const { data: milestone } = await supabase.from('milestones').select('proposal_id, status, procurement_proposals!inner(startup_id)').eq('id', milestoneId).single();
  
  if (!milestone || getProposalStartupId(milestone.procurement_proposals) !== startupId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('milestone', milestone.status, 'evidence_submitted', 'startup');

  const { data, error } = await supabase.from('proposal_documents').insert({
    proposal_id: milestone.proposal_id,
    uploaded_by: startupId,
    document_title: documentTitle,
    document_type: 'milestone_evidence',
    storage_path: storagePath
  }).select('id').single();

  if (error || !data) throw new ProcurementError("Failed to upload evidence", "DB_ERROR");

  await supabase.from('milestones').update({ status: 'evidence_submitted', evidence_url: storagePath }).eq('id', milestoneId);
  await writeAuditLog(startupId, 'startup_founder', 'document', data.id, 'uploaded', null, { type: 'milestone_evidence', milestoneId });
}

export async function validateMilestone(validatorId: string, milestoneId: string, outcome: 'pass' | 'fail' | 'needs-rework', notes: string) {
  const supabase = await createClient();
  const { data: milestone } = await supabase.from('milestones').select('proposal_id, status, procurement_proposals!inner(decision_by)').eq('id', milestoneId).single();
  
  if (!milestone) throw new ProcurementError("Not found", "NOT_FOUND");
  
  const proposal = Array.isArray(milestone.procurement_proposals) ? milestone.procurement_proposals[0] : milestone.procurement_proposals;
  if (proposal?.decision_by === validatorId) {
    throw new ProcurementError("Approving officer cannot also validate", "FORBIDDEN");
  }

  const newStatus = outcome === 'pass' ? 'validated' : (outcome === 'fail' ? 'rejected' : 'evidence_submitted');
  if (outcome !== 'needs-rework') {
    assertTransition('milestone', milestone.status, newStatus, 'validator');
  }

  await supabase.from('milestones').update({ 
    status: newStatus,
    validated_by: validatorId,
    validated_at: new Date().toISOString(),
    validator_feedback: notes
  }).eq('id', milestoneId);
  
  await writeAuditLog(validatorId, 'validator', 'milestone', milestoneId, 'validated', { status: milestone.status }, { status: newStatus, outcome, notes });
}

export async function signoffMilestone(officerId: string, milestoneId: string) {
  const supabase = await createClient();
  const { data: milestone } = await supabase.from('milestones').select('proposal_id, status, procurement_proposals!inner(challenges!inner(department_id))').eq('id', milestoneId).single();
  
  if (!milestone || getProposalDeptId(milestone.procurement_proposals) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  assertTransition('milestone', milestone.status, 'approved', 'department_officer');

  await supabase.from('milestones').update({ 
    status: 'approved',
    approved_at: new Date().toISOString()
  }).eq('id', milestoneId);
  await writeAuditLog(officerId, 'department_officer', 'milestone', milestoneId, 'status_changed', { status: milestone.status }, { status: 'approved' });
}

export async function releasePayment(officerId: string, milestoneId: string) {
  const supabase = await createClient();
  const { data: milestone } = await supabase.from('milestones').select('proposal_id, status, payment_status, procurement_proposals!inner(challenges!inner(department_id))').eq('id', milestoneId).single();
  
  if (!milestone || getProposalDeptId(milestone.procurement_proposals) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  if (milestone.status !== 'approved' || milestone.payment_status !== 'unpaid') {
    throw new ProcurementError("Milestone not ready for payment release", "INVALID_TRANSITION");
  }

  await supabase.from('milestones').update({ payment_status: 'processing' }).eq('id', milestoneId);
  await writeAuditLog(officerId, 'department_officer', 'milestone', milestoneId, 'payment_released', { payment_status: 'unpaid' }, { payment_status: 'processing' });
}

export async function markPaymentPaid(adminId: string, milestoneId: string, ref: string) {
  const supabase = await createClient();
  const { data: milestone } = await supabase.from('milestones').select('payment_status, approved_at').eq('id', milestoneId).single();
  
  if (!milestone || milestone.payment_status !== 'processing') {
    throw new ProcurementError("Payment not released", "INVALID_TRANSITION");
  }

  const paidDate = new Date();
  let daysToPayment = null;
  let isOnTime = null;

  if (milestone.approved_at) {
    const approvedDate = new Date(milestone.approved_at);
    daysToPayment = Math.max(0, Math.floor((paidDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)));
    isOnTime = daysToPayment <= PAYMENT_SLA_DAYS;
  }

  await supabase.from('milestones').update({ 
    payment_status: 'paid', 
    paid_at: paidDate.toISOString(), 
    payment_reference: ref,
    days_to_payment: daysToPayment,
    is_on_time: isOnTime
  }).eq('id', milestoneId);
  
  await writeAuditLog(adminId, 'platform_admin', 'milestone', milestoneId, 'payment_paid', { payment_status: 'processing' }, { payment_status: 'paid', ref, daysToPayment, isOnTime });
}

export async function recordScaleDecision(officerId: string, proposalId: string, decision: 'Scale' | 'Extend' | 'Terminate', pathway: string, reason: string) {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from('procurement_proposals')
    .select('status, challenges!inner(department_id)')
    .eq('id', proposalId)
    .single();

  if (!proposal || getChallengeDeptId(proposal.challenges) !== officerId) {
    throw new ProcurementError("Unauthorized", "FORBIDDEN");
  }

  const nextStatus = decision === 'Scale' ? 'scaled' : (decision === 'Extend' ? 'extended' : 'terminated');
  assertTransition('proposal', proposal.status, nextStatus, 'department_officer');

  const { error } = await supabase.from('scale_decisions').insert({
    proposal_id: proposalId,
    decision: decision.toLowerCase(),
    pathway: decision === 'Scale' ? pathway : 'None',
    reason,
    decided_by: officerId
  });

  if (error) throw new ProcurementError("Failed to record scale decision", "DB_ERROR");

  await supabase.from('procurement_proposals').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', proposalId);
  await writeAuditLog(officerId, 'department_officer', 'proposal', proposalId, 'status_changed', { status: proposal.status }, { status: nextStatus, decision, reason });
}


