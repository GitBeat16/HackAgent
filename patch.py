import re

with open('lib/server/procurement.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix assertTransitions
content = re.sub(r"assertTransition\(proposal\.status,\s*\['screened'\],\s*'queueAiEvaluation'\);", r"assertTransition('proposal', proposal.status, 'evaluating', 'department_officer');", content)
content = re.sub(r"assertTransition\(proposal\.status,\s*\['evaluating'\],\s*'recordEvaluationResult'\);", r"assertTransition('proposal', proposal.status, 'evaluated', 'department_officer');", content)
content = re.sub(r"assertTransition\(proposal\.status,\s*\['evaluated'\],\s*'approveProposal'\);", r"assertTransition('proposal', proposal.status, 'pilot_approved', 'department_officer');", content)
content = re.sub(r"assertTransition\(proposal\.status,\s*\['evaluated'\],\s*'rejectProposal'\);", r"assertTransition('proposal', proposal.status, 'rejected', 'department_officer');", content)
content = re.sub(r"assertTransition\(proposal\.status,\s*\['submitted'\],\s*'runEligibilityScreening'\);", r"assertTransition('proposal', proposal.status, 'screened', 'department_officer');", content)

content = re.sub(r"assertTransition\(milestone\.status,\s*\['pending',\s*'rejected'\],\s*'uploadMilestoneEvidence'\);", r"assertTransition('milestone', milestone.status, 'evidence_submitted', 'startup');", content)
content = re.sub(r"assertTransition\(milestone\.status,\s*\['evidence_submitted'\],\s*'validateMilestone'\);", r"assertTransition('milestone', milestone.status, newStatus, 'validator');", content)
content = re.sub(r"assertTransition\(milestone\.status,\s*\['validated'\],\s*'signoffMilestone'\);", r"assertTransition('milestone', milestone.status, 'approved', 'department_officer');", content)

content = re.sub(r"assertTransition\(proposal\.status,\s*\['pilot_active',\s*'pilot_complete'\],\s*'recordScaleDecision'\);", r"assertTransition('proposal', proposal.status, nextStatus, 'department_officer');", content)

# Fix separation of duties for validator != approver. It already has a check for validateMilestone:
# if ((milestone.procurement_proposals as ...).challenges.department_id === validatorId) {
#    throw new ProcurementError("Approving officer cannot also validate", "FORBIDDEN");
# }
# It looks like it's already there!

# Fix officer override for approval: 
# If verdict was Reject or Conditional Pilot, require override_reason
override_check = """
  if (proposal.verdict !== 'Recommend Pilot' && !overrideReason) {
    throw new ProcurementError("Override reason is required when overriding AI rejection.", "VALIDATION_FAILED");
  }
"""
# Actually, the AI match score and verdict are stored in `reports` or `procurement_proposals`?
# In v2, ai_match_score is in procurement_proposals, but verdict is in reports. 

# Fix rejectProposal rejection_reason:
content = re.sub(r"export async function rejectProposal\([^)]+\)\s*\{", r"""export async function rejectProposal(officerId: string, proposalId: string, rejectionReason: string) {
  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new ProcurementError("Rejection reason is mandatory.", "VALIDATION_FAILED");
  }""", content)

# Instead of regex patching the logic, let's just create a completely clean lib/server/procurement.ts.

with open('lib/server/procurement.ts', 'w', encoding='utf-8') as f:
    f.write(content)

