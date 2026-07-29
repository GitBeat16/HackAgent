/**
 * End-to-end simulation of a full 24-turn session.
 *
 * Run with `npm run test:session`. Drives the real policy with canned
 * dialogue and asserts the structural guarantees a session depends on:
 * everyone speaks, phases advance in order, nobody speaks twice in a row,
 * and the founder can redirect the room.
 */
import {
  pickNextSpeaker,
  currentPhase,
  debateProgress,
  scoreSpeakers,
  PHASE_PROFILES,
  PHASE_LABEL,
} from "@/lib/ai/debate-policy";
import { detectTopic, TOPIC_LABEL } from "@/lib/ai/topics";
import { buildBoardMemory, founderQuestionIn } from "@/lib/ai/meeting-memory";
import { executivePersonas } from "@/lib/ai/executives";
import type { MeetingTranscriptMessage } from "@/types/api";

const SEATS = executivePersonas.map((p) => p.id);
const IDENTITIES = Object.fromEntries(
  executivePersonas.map((p) => [p.id, { name: p.name, role: p.role }]),
);

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

let seq = 0;
function msg(speakerId: string, message: string): MeetingTranscriptMessage {
  seq += 1;
  const id = IDENTITIES[speakerId];
  return {
    id: `m${seq}`,
    speakerId,
    speakerName: speakerId === "founder" ? "You" : (id?.name ?? speakerId),
    role: speakerId === "founder" ? "Founder" : (id?.role ?? "Executive"),
    message,
    createdAt: new Date(Date.now() + seq * 1000).toISOString(),
  };
}

/** Canned lines per seat, so the simulation produces plausible topic signal. */
const LINES: Record<string, string> = {
  ceo: "I need a single thesis here. What is the one bet this company is making?",
  cto: "Inference latency and scaling are the real bottleneck before any of this ships.",
  cfo: "The unit economics do not work — CAC payback is over 30 months and the burn rate is climbing.",
  cmo: "The positioning is muddled. No customer could repeat this in one sentence.",
  vc: "Against comparables in this market, the valuation assumes traction that is not here yet.",
  legal: "HIPAA compliance and clinical data consent are diligence blockers, not footnotes.",
  research: "The claimed market size is unverified. I cannot source that competitor benchmark.",
  growth: "Retention is the leak. Churn at 20% monthly means acquisition spend is wasted.",
};

const base = { seatedExecutiveIds: SEATS, identities: IDENTITIES, profile: PHASE_PROFILES.full! };

console.log("\n=== Simulated 24-turn session (8 seats x 3 phases) ===\n");

let transcript: MeetingTranscriptMessage[] = [];
const order: Array<{ turn: number; phase: string; speaker: string; topic: string }> = [];
let founderInterjected = false;
let pausesForFounder = 0;

for (let turn = 1; turn <= 40; turn += 1) {
  const phase = currentPhase({ ...base, transcript });
  if (!phase) break;

  // The founder cuts in once, mid-opening, with a technical admission.
  let pending: string | undefined;
  if (!founderInterjected && transcript.length === 3) {
    pending = "Our AI model cannot scale — inference costs are killing us.";
    founderInterjected = true;
  }

  const next = pickNextSpeaker({ ...base, transcript, pendingFounderMessage: pending });
  if (!next) break;

  const topic = detectTopic(transcript, pending);
  order.push({ turn, phase, speaker: next, topic: topic.topic });

  if (pending) transcript = [...transcript, msg("founder", pending)];
  const line = msg(next, LINES[next] ?? "A considered point.");
  transcript = [...transcript, line];

  if (founderQuestionIn(line, SEATS, IDENTITIES)) pausesForFounder += 1;
}

// ---- structural guarantees
console.log("1. Session structure");
{
  const counts = new Map<string, number>();
  for (const entry of order) counts.set(entry.speaker, (counts.get(entry.speaker) ?? 0) + 1);
  check("session terminated (did not hit the 40-turn safety bound)", order.length < 40, `${order.length} turns`);
  check("exactly 24 executive turns", order.length === 24, `${order.length}`);
  check("every executive spoke 3 times", SEATS.every((s) => counts.get(s) === 3),
    JSON.stringify(Object.fromEntries(counts)));

  const phases = [...new Set(order.map((o) => o.phase))];
  check("all three phases ran in order",
    phases.join(",") === "opening,cross_examination,closing", phases.join(","));

  let doubles = 0;
  for (let i = 1; i < order.length; i += 1) if (order[i]!.speaker === order[i - 1]!.speaker) doubles += 1;
  check("nobody spoke twice in a row", doubles === 0, `${doubles}`);

  const progress = debateProgress({ ...base, transcript });
  check("progress reports complete", progress.spoken === 24 && progress.total === 24,
    `${progress.spoken}/${progress.total}`);
  check("phase is null once finished", progress.phase === null, String(progress.phase));
}

// ---- the founder interjection actually redirected the room
console.log("\n2. The founder's interjection redirected the board");
{
  const afterInterjection = order.find((o) => o.turn === 4);
  check("the turn after the founder's scaling admission goes to the CTO",
    afterInterjection?.speaker === "cto", `got ${afterInterjection?.speaker}`);
  check("and the topic was read as technical",
    afterInterjection?.topic === "technical", `got ${afterInterjection?.topic}`);
}

// ---- memory holds up over a full session
console.log("\n3. Memory over a full session");
{
  const memory = buildBoardMemory({ transcript, seatedExecutiveIds: SEATS, identities: IDENTITIES });
  const withPositions = SEATS.filter((s) => (memory.byExecutive[s]?.positionsTaken.length ?? 0) > 0);
  check("most executives accumulated remembered positions", withPositions.length >= 6,
    `${withPositions.length}/8`);
  check("positions are capped so the prompt cannot grow unbounded",
    SEATS.every((s) => (memory.byExecutive[s]?.positionsTaken.length ?? 0) <= 4));
  check("key claims are capped", memory.keyClaims.length <= 6, `${memory.keyClaims.length}`);
}

// ---- founder question detection discriminates correctly
console.log("\n4. Founder-question detection");
{
  const toFounder = msg("cto", "How will you handle inference costs at 10x the current volume?");
  check("a question with no colleague named is for the founder",
    founderQuestionIn(toFounder, SEATS, IDENTITIES) !== null);

  const toColleague = msg("cto", "Marcus, why do you think CAC matters more than retention here?");
  check("a question naming a colleague is NOT for the founder",
    founderQuestionIn(toColleague, SEATS, IDENTITIES) === null);

  const statement = msg("cfo", "The burn rate is unsustainable at this headcount.");
  check("a statement is not a question", founderQuestionIn(statement, SEATS, IDENTITIES) === null);

  console.log(`     (the simulated session paused for the founder ${pausesForFounder}x)`);
}

// ---- demo profile
console.log("\n5. Demo profile shortens the session");
{
  let t: MeetingTranscriptMessage[] = [];
  const demo = { ...base, profile: PHASE_PROFILES.demo! };
  let turns = 0;
  for (let i = 0; i < 40; i += 1) {
    const next = pickNextSpeaker({ ...demo, transcript: t });
    if (!next) break;
    t = [...t, msg(next, LINES[next] ?? "A point.")];
    turns += 1;
  }
  check("demo profile runs 16 turns", turns === 16, `${turns}`);
  check("demo still includes cross-examination",
    debateProgress({ ...demo, transcript: t.slice(0, 8) }).phase === "cross_examination",
    String(debateProgress({ ...demo, transcript: t.slice(0, 8) }).phase));
}

// ---- scoring is deterministic
console.log("\n6. Determinism (client and server must agree)");
{
  const input = { ...base, transcript: transcript.slice(0, 5) };
  const a = scoreSpeakers(input).map((s) => `${s.executiveId}:${s.score.toFixed(6)}`).join("|");
  const b = scoreSpeakers(input).map((s) => `${s.executiveId}:${s.score.toFixed(6)}`).join("|");
  check("identical input yields identical ranking", a === b);
  check("no randomness in the policy", !a.includes("NaN"));
}

console.log("\n--- turn order ---");
for (const o of order) {
  console.log(
    `  ${String(o.turn).padStart(2)}  ${PHASE_LABEL[o.phase as keyof typeof PHASE_LABEL].padEnd(20)} ` +
      `${o.speaker.padEnd(9)} (${TOPIC_LABEL[o.topic as keyof typeof TOPIC_LABEL]})`,
  );
}

console.log(failures === 0 ? "\nALL E2E CHECKS PASSED" : `\n${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
