import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { queueAiEvaluation } from "@/lib/server/procurement";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole('department_officer');
    if (response) return response;

    const supabase = await createClient();
    
    // Fetch the proposal and challenge details
    const { data: proposal } = await supabase
      .from('procurement_proposals')
      .select('*, challenges(title, description, domain)')
      .eq('id', (await params).id)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // We create a meeting representing the AI evaluation session.
    // In HackAgent, the evaluation uses the meetings table as the core structure.
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        user_id: user.id, // The officer triggers it
        startup_name: "Startup Proposal", // Could fetch from profiles if joined
        one_liner: proposal.challenges.title,
        industry: proposal.challenges.domain,
        pitch: proposal.proposal_text,
        seated_executive_ids: ['tech_expert', 'finance_auditor', 'legal_compliance', 'impact_assessor', 'risk_officer']
      })
      .select('id')
      .single();

    if (meetingError || !meeting) {
      throw new Error("Failed to create evaluation meeting");
    }

    // Update state to Evaluating
    await queueAiEvaluation(user.id, (await params).id, meeting.id);

    return NextResponse.json({ success: true, meetingId: meeting.id });
  } catch (error: unknown) {
    console.error("Evaluation trigger error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === 'FORBIDDEN' ? 403 : 500 });
  }
}


