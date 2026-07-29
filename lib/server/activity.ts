import { createClient } from "@/lib/supabase/server";

export type ActivityTone = "brass" | "signal" | "success" | "warning";
export type ActivityChangeType = "Report" | "Pitch deck" | "PRD" | "Financials";

export interface ActivityInput {
  title: string;
  description: string;
  tone?: ActivityTone;
  changeType?: ActivityChangeType;
}

/**
 * Appends to the feed behind both the dashboard's activity list and the
 * `/history` timeline.
 *
 * Deliberately swallows failures: an activity entry is a side note, and
 * losing one should never fail the board session that produced it.
 */
export async function logActivity(userId: string, input: ActivityInput) {
  try {
    const supabase = await createClient();
    await supabase.from("activity_events").insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      tone: input.tone ?? "brass",
      change_type: input.changeType ?? "Report",
    });
  } catch {
    // Non-fatal by design — see above.
  }
}
