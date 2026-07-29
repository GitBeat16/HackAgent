/**
 * Retrieved evidence, persisted per meeting.
 *
 * Replaces the module-level `Map` that used to hold this. That cache worked
 * on a single dev server and failed silently in production: on a serverless
 * platform each debate turn and the finalize call can execute in a different
 * instance, so the report read an empty cache and the Sources section
 * vanished — on the deployed URL only, which is the worst place to discover
 * it. Evidence the board actually retrieved has to outlive the process.
 *
 * Server-only.
 */

import { createClient } from "@/lib/supabase/server";
import type { ResearchFinding } from "@/lib/ai/research";

export interface StoredFinding extends ResearchFinding {
  executiveId: string;
  query: string;
}

/**
 * Records findings for a meeting.
 *
 * Conflicts on `(meeting_id, url)` are ignored rather than updated: the same
 * source legitimately surfaces for more than one seat across a session, and
 * the first retrieval is as good as the second.
 *
 * Never throws. A failed write must not take down the debate turn that
 * triggered it — the executive has already spoken, and losing a citation is
 * a far smaller failure than losing the turn.
 */
export async function saveFindings(
  meetingId: string,
  executiveId: string,
  query: string,
  findings: ResearchFinding[],
): Promise<void> {
  if (findings.length === 0) return;

  try {
    const supabase = await createClient();
    await supabase.from("research_findings").upsert(
      findings.map((finding) => ({
        meeting_id: meetingId,
        executive_id: executiveId,
        query,
        claim: finding.claim,
        source: finding.source,
        url: finding.url,
      })),
      { onConflict: "meeting_id,url", ignoreDuplicates: true },
    );
  } catch {
    // Deliberately swallowed — see the note above.
  }
}

/** Everything retrieved for a meeting, oldest first. */
export async function loadFindings(meetingId: string): Promise<StoredFinding[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("research_findings")
      .select("executive_id, query, claim, source, url")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data.map((row) => ({
      executiveId: row.executive_id,
      query: row.query,
      claim: row.claim,
      source: row.source,
      url: row.url,
    }));
  } catch {
    return [];
  }
}

/** Deduplicated source list for the report's citations. */
export async function loadSources(meetingId: string): Promise<Array<{ title: string; url: string }>> {
  const findings = await loadFindings(meetingId);
  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string }> = [];
  for (const finding of findings) {
    if (seen.has(finding.url)) continue;
    seen.add(finding.url);
    sources.push({ title: finding.source, url: finding.url });
  }
  return sources;
}
