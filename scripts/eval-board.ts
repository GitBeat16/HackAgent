/**
 * Runs the board against graded pitches and reports whether its judgement
 * holds up.
 *
 * Run with `npm run eval` (add `--runs 2` to measure consistency).
 *
 * ## This spends real Groq quota
 *
 * Six pitches x ~16 turns x one verdict call is roughly 100 model calls per
 * run. It is paced the same way a live session is, so a full pass takes
 * several minutes. Use `--pitches strong-1,weak-1` to run a subset while
 * iterating.
 *
 * ## What the numbers mean
 *
 * The fixtures are graded by hand against investor criteria, not against
 * observed outcomes. So this measures whether the board *discriminates
 * consistently in the direction a human would* — not whether it predicts
 * which startups succeed. Say that out loud whenever you show the results;
 * claiming predictive validity from six written pitches would be the same
 * unearned confidence this project criticises elsewhere.
 */

import fs from "node:fs";
import path from "node:path";

// `next dev` loads .env.local automatically; a bare script does not.
for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2]!.replace(/^["']|["']$/g, "").trim();
    if (value && !process.env[match[1]!]) process.env[match[1]!] = value;
  }
}

import { advanceDebate } from "@/lib/ai/board-orchestrator";
import { isDebateComplete, resolvePhaseProfile } from "@/lib/ai/debate-policy";
import { generateVerdict } from "@/lib/ai/report-generator";
import { executivePersonas } from "@/lib/ai/executives";
import { evalPitches, type EvalPitch } from "@/lib/eval/fixtures";
import {
  consistency,
  deliberationRate,
  rankCorrelation,
  summariseByTier,
  tiersSeparate,
  type RunResult,
} from "@/lib/eval/metrics";
import type { MeetingTranscriptMessage } from "@/types/api";

// ---- args -----------------------------------------------------------------

const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1]! : fallback;
}

const RUNS = Math.max(1, Number(arg("runs", "1")));
const ONLY = arg("pitches", "").split(",").map((s) => s.trim()).filter(Boolean);
const SEATS = executivePersonas.map((p) => p.id);

const pitches: EvalPitch[] = ONLY.length
  ? evalPitches.filter((p) => ONLY.includes(p.id))
  : evalPitches;

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not set. Add it to .env.local before running the eval.");
  process.exit(1);
}

// ---- one session ----------------------------------------------------------

async function runSession(pitch: EvalPitch): Promise<RunResult> {
  const profile = resolvePhaseProfile();
  let transcript: MeetingTranscriptMessage[] = [];

  const state = {
    // The orchestrator persists research against this id. In the eval there is
    // no request context, so the Supabase client throws and the store's own
    // try/catch returns empty — the debate runs with no external evidence,
    // which keeps the eval measuring judgement rather than search quality.
    meetingId: `eval_${pitch.id}`,
    startupName: pitch.startupName,
    oneLiner: pitch.oneLiner,
    industry: pitch.industry,
    stage: pitch.stage,
    pitch: pitch.pitch,
    seatedExecutiveIds: SEATS,
    transcript,
  };

  // Safety bound: a policy bug that never completes must fail the eval rather
  // than burn the whole quota in a loop.
  const maxTurns = SEATS.length * 4;
  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (isDebateComplete({ seatedExecutiveIds: SEATS, transcript, profile })) break;
    const result = await advanceDebate({ ...state, transcript });
    if (!result.message) break;
    transcript = [...transcript, result.message];
    if (result.isComplete) break;
  }

  const { votes, report } = await generateVerdict({
    startupName: pitch.startupName,
    oneLiner: pitch.oneLiner,
    industry: pitch.industry,
    stage: pitch.stage,
    pitch: pitch.pitch,
    seatedExecutiveIds: SEATS,
    transcript,
  });

  return {
    pitchId: pitch.id,
    tier: pitch.tier,
    investmentScore: report.investmentScore,
    verdict: report.verdict,
    distinctVotes: new Set(votes.map((v) => v.vote)).size,
    meanConfidence: Math.round(
      votes.reduce((sum, v) => sum + v.confidence, 0) / Math.max(1, votes.length),
    ),
  };
}

// ---- harness --------------------------------------------------------------

async function main() {
  console.log(`\nBoardroomAI eval — ${pitches.length} pitches x ${RUNS} run(s)\n`);

  const all: RunResult[] = [];
  const perPitch = new Map<string, number[]>();

  for (const pitch of pitches) {
    for (let run = 1; run <= RUNS; run += 1) {
      const label = `${pitch.id} (${pitch.tier})${RUNS > 1 ? ` run ${run}` : ""}`;
      process.stdout.write(`  running ${label} … `);
      try {
        const result = await runSession(pitch);
        all.push(result);
        perPitch.set(pitch.id, [...(perPitch.get(pitch.id) ?? []), result.investmentScore]);
        console.log(
          `score ${result.investmentScore} · ${result.verdict} · ` +
            `${result.distinctVotes === 1 ? "unanimous" : `${result.distinctVotes} positions`}`,
        );
      } catch (error) {
        console.log(`FAILED — ${(error as Error).message}`);
      }
    }
  }

  if (all.length === 0) {
    console.log("\nNo sessions completed. Check GROQ_API_KEY and rate limits.");
    process.exit(1);
  }

  console.log("\n--- Scores by tier ---");
  for (const row of summariseByTier(all)) {
    console.log(
      `  ${row.tier.padEnd(9)} n=${row.count}  mean ${String(row.meanScore).padStart(3)}  ` +
        `range ${row.minScore}-${row.maxScore}`,
    );
  }

  const separation = tiersSeparate(all);
  const correlation = rankCorrelation(all);
  const deliberation = deliberationRate(all);
  const spread = consistency([...perPitch.values()]);

  console.log("\n--- Metrics ---");
  console.log(`  Tier separation      ${separation.separated ? "clean" : "overlapping"}`);
  for (const overlap of separation.overlaps) console.log(`      ${overlap}`);
  console.log(`  Rank correlation     ${correlation.toFixed(2)}  (1.0 = perfect agreement with the grading)`);
  console.log(`  Deliberation rate    ${deliberation}%  (sessions where the board did not vote unanimously)`);
  if (RUNS > 1) {
    console.log(`  Score spread         mean ${spread.meanSpread}, worst ${spread.worstSpread} points across repeat runs`);
  } else {
    console.log(`  Score spread         not measured — re-run with --runs 2`);
  }

  console.log("\n--- Reading this ---");
  console.log(
    "  Correlation above ~0.7 with clean separation means the board discriminates\n" +
      "  the way the rubric does. A deliberation rate near 0% would mean the eight\n" +
      "  personas are collapsing into one voice, which is the failure the multi-agent\n" +
      "  design exists to prevent. Scores are graded against investor criteria, not\n" +
      "  observed outcomes — this measures consistency of judgement, not prediction.\n",
  );
}

void main();
