import { createClient } from "@/lib/supabase/server";
import { executivePersonas } from "@/lib/ai/executives";
import type { ExecutiveVoteDetail, ReportDetail } from "@/features/reports/types";

/**
 * The report screens print `generatedAt` verbatim, so it is formatted here
 * rather than shipped as a raw ISO string.
 */
function formatGeneratedAt(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

export async function listReports(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, startup_name, one_liner, industry, investment_score, verdict, generated_at")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((report) => ({ id: report.id, startupName: report.startup_name, oneLiner: report.one_liner, industry: report.industry, investmentScore: report.investment_score, verdict: report.verdict as "Strong buy" | "Conditional" | "Pass", generatedAt: formatGeneratedAt(report.generated_at) }));
}

/**
 * Reports written before the richer columns existed return `null` for them,
 * and reports written before the migration ran do not have the columns at
 * all. Both must render, so every optional field is only attached when it
 * actually holds something.
 */
function optional<T>(value: T | null | undefined): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
}

/**
 * The board's individual votes for a report's session.
 *
 * Fetched as a second query rather than a nested select: `votes` hangs off
 * `meetings`, not `reports`, so embedding it would mean joining through the
 * meeting and unwrapping a nested array for no benefit. Two explicit reads
 * are cheaper to understand and to debug.
 *
 * Returns undefined — not an empty array — when there is nothing to show, so
 * the report page can hide the section rather than render an empty table.
 * Reports written before the richer vote columns existed land here.
 */
async function getReportVotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  meetingId: string | null,
): Promise<ExecutiveVoteDetail[] | undefined> {
  if (!meetingId) return undefined;

  const { data, error } = await supabase
    .from("votes")
    .select(
      "executive_id, vote, rationale, confidence, biggest_risk, biggest_strength, required_milestone, cheque_size, return_horizon",
    )
    .eq("meeting_id", meetingId);

  // A missing vote list must not take down a report that is otherwise fine.
  if (error || !data?.length) return undefined;

  const votes = data.map((row) => {
    const persona = executivePersonas.find((candidate) => candidate.id === row.executive_id);
    return {
      executiveId: row.executive_id,
      executiveName: persona?.name ?? row.executive_id,
      role: persona?.role ?? "Executive",
      vote: row.vote as ExecutiveVoteDetail["vote"],
      rationale: row.rationale ?? "No rationale recorded.",
      confidence: typeof row.confidence === "number" ? row.confidence : 0,
      biggestRisk: row.biggest_risk ?? "",
      biggestStrength: row.biggest_strength ?? "",
      requiredMilestone: row.required_milestone ?? "",
      chequeSize: row.cheque_size ?? "",
      returnHorizon: row.return_horizon ?? "",
    } satisfies ExecutiveVoteDetail;
  });

  // Seating order is not stored on `votes`, so sort by the canonical roster
  // order — the same order the boardroom seats them in.
  const order = new Map(executivePersonas.map((persona, index) => [persona.id, index]));
  votes.sort((a, b) => (order.get(a.executiveId) ?? 99) - (order.get(b.executiveId) ?? 99));

  return votes;
}

export async function getReport(userId: string, id: string): Promise<ReportDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const votes = await getReportVotes(supabase, data.meeting_id ?? null);

  return {
    id: data.id,
    startupName: data.startup_name,
    oneLiner: data.one_liner,
    industry: data.industry,
    investmentScore: data.investment_score,
    verdict: data.verdict,
    generatedAt: formatGeneratedAt(data.generated_at),
    executiveSummary: data.executive_summary,
    swot: data.swot,
    dimensions: data.dimensions,
    risks: data.risks,
    financials: data.financials,
    investmentReadiness: optional(data.investment_readiness),
    confidence: optional(data.confidence),
    consensus: optional(data.consensus),
    disagreements: optional(data.disagreements),
    mostConvincingArgument: optional(data.most_convincing_argument),
    weakestFounderAnswer: optional(data.weakest_founder_answer),
    riskTimeline: optional(data.risk_timeline),
    nextSteps: optional(data.next_steps),
    roadmap: optional(data.roadmap),
    sources: optional(data.sources),
    votes,
  } as ReportDetail;
}

/** Writes the board's verdict. One report per meeting — re-running a session replaces it. */
export async function createReport(
  userId: string,
  meetingId: string,
  report: Omit<ReportDetail, "id" | "generatedAt">,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        startup_name: report.startupName,
        one_liner: report.oneLiner,
        industry: report.industry,
        investment_score: report.investmentScore,
        verdict: report.verdict,
        executive_summary: report.executiveSummary,
        swot: report.swot,
        dimensions: report.dimensions,
        risks: report.risks,
        financials: report.financials,
        investment_readiness: report.investmentReadiness ?? null,
        confidence: report.confidence ?? null,
        consensus: report.consensus ?? [],
        disagreements: report.disagreements ?? [],
        most_convincing_argument: report.mostConvincingArgument ?? null,
        weakest_founder_answer: report.weakestFounderAnswer ?? null,
        risk_timeline: report.riskTimeline ?? [],
        next_steps: report.nextSteps ?? [],
        roadmap: report.roadmap ?? [],
        sources: report.sources ?? [],
        generated_at: new Date().toISOString(),
      },
      { onConflict: "meeting_id" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save report.");
  return data.id;
}
