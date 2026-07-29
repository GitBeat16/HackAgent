/**
 * Behavioural tests for the speaker-selection policy, topic detection and
 * executive memory.
 *
 * Run with `npm run test:orchestration`. No network, no database, no model —
 * the whole orchestration layer is pure functions precisely so it can be
 * tested like this.
 */
import { detectTopic } from "@/lib/ai/topics";
import {
  scoreSpeakers,
  pickNextSpeaker,
  currentPhase,
  debateProgress,
  isDebateComplete,
  PHASE_PROFILES,
} from "@/lib/ai/debate-policy";
import { buildBoardMemory } from "@/lib/ai/meeting-memory";
import type { MeetingTranscriptMessage } from "@/types/api";

const SEATS = ["ceo", "cto", "cfo", "cmo", "vc", "legal", "research", "growth"];
const IDENTITIES: Record<string, { name: string; role: string }> = {
  ceo: { name: "Elena Vasquez", role: "CEO Agent" },
  cto: { name: "Priya Nair", role: "CTO Agent" },
  cfo: { name: "Marcus Webb", role: "CFO Agent" },
  cmo: { name: "Aiko Tanaka", role: "CMO Agent" },
  vc: { name: "Jonah Kessler", role: "VC Agent" },
  legal: { name: "Diane Okafor", role: "Legal Agent" },
  research: { name: "Nadia Petrov", role: "Research Agent" },
  growth: { name: "Théo Marchand", role: "Growth Agent" },
};

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  if (condition) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

let seq = 0;
function msg(speakerId: string, message: string): MeetingTranscriptMessage {
  seq += 1;
  const identity = IDENTITIES[speakerId];
  return {
    id: `m${seq}`,
    speakerId,
    speakerName: speakerId === "founder" ? "You" : (identity?.name ?? speakerId),
    role: speakerId === "founder" ? "Founder" : (identity?.role ?? "Executive"),
    message,
    createdAt: new Date(Date.now() + seq * 1000).toISOString(),
  };
}

const profile = PHASE_PROFILES.full!;
const base = { seatedExecutiveIds: SEATS, identities: IDENTITIES, profile };

// ---------------------------------------------------------------- topics
console.log("\n1. Topic detection");
{
  const t = detectTopic([], "Our AI model cannot scale — inference latency is the bottleneck.");
  check("scaling/latency question reads as technical", t.topic === "technical", `got ${t.topic}`);

  const f = detectTopic([], "Our CAC is too high and the burn rate gives us six months of runway.");
  check("CAC/burn/runway reads as financial", f.topic === "financial", `got ${f.topic}`);

  const g = detectTopic([], "Churn is 20% monthly and retention in the onboarding funnel is poor.");
  check("churn/retention/funnel reads as growth", g.topic === "growth", `got ${g.topic}`);

  const l = detectTopic([], "HIPAA compliance and FDA approval are required before launch.");
  check("HIPAA/FDA reads as legal", l.topic === "legal", `got ${l.topic}`);

  const n = detectTopic([], "Thanks for having me. Let's get started.");
  check("filler reads as general, not a random topic", n.topic === "general", `got ${n.topic}`);

  const cache = detectTopic([], "We cache responses to reduce cost.");
  check("'cache' does not trigger the CAC keyword", cache.topic !== "financial", `got ${cache.topic}`);
}

// ------------------------------------------------- the headline behaviour
console.log("\n2. Speaker selection follows the topic (the headline claim)");
{
  const transcript = [msg("ceo", "Give me the single thesis behind this company.")];
  const founderLine = "Our AI model cannot scale.";

  const ranked = scoreSpeakers({
    ...base,
    transcript,
    pendingFounderMessage: founderLine,
  });
  const order = ranked.map((r) => r.executiveId);
  const cto = order.indexOf("cto");
  const cfo = order.indexOf("cfo");

  console.log(`     ranking: ${order.slice(0, 4).join(" > ")} …`);
  check("CTO is chosen for 'our AI model cannot scale'", order[0] === "cto", `got ${order[0]}`);
  check("CTO ranks above CFO on a scaling question", cto < cfo, `cto@${cto} cfo@${cfo}`);

  const top = ranked[0]!;
  console.log(
    `     CTO parts: relevance=${top.parts.relevance} fairness=${top.parts.fairness} ` +
      `mention=${top.parts.founderMention} disagree=${top.parts.disagreement}`,
  );
  // The meaningful claim is that relevance is what put the CTO on top, not
  // that it cleared some absolute number — the component is deliberately
  // damped by topic confidence, so its ceiling moves.
  const bestRelevance = Math.max(...ranked.map((r) => r.parts.relevance));
  check("CTO holds the highest relevance in the room", top.parts.relevance === bestRelevance,
    `cto=${top.parts.relevance} best=${bestRelevance}`);
  check("relevance, not fairness, is the differentiator",
    ranked.every((r) => r.parts.fairness === top.parts.fairness),
    "fairness should be tied when nobody has spoken");
}

console.log("\n3. The same board, a financial question");
{
  const transcript = [msg("ceo", "Give me the single thesis behind this company.")];
  const ranked = scoreSpeakers({
    ...base,
    transcript,
    pendingFounderMessage: "Our unit economics are weak — CAC is high and the burn rate is climbing.",
  });
  const order = ranked.map((r) => r.executiveId);
  console.log(`     ranking: ${order.slice(0, 4).join(" > ")} …`);
  check("CFO takes a unit-economics question", order[0] === "cfo", `got ${order[0]}`);
  check("CTO no longer leads", order.indexOf("cto") > 0);
}

// ---------------------------------------------------------- founder mention
console.log("\n4. Being named by the founder pulls you forward");
{
  const transcript = [msg("ceo", "What is the thesis?")];
  const ranked = scoreSpeakers({
    ...base,
    transcript,
    // Legal has the LOWEST priority and no topical claim here — only the
    // direct address should be able to lift it.
    pendingFounderMessage: "Diane, what regulatory exposure do you see?",
  });
  check("named executive is selected", ranked[0]!.executiveId === "legal", `got ${ranked[0]!.executiveId}`);
  check("mention component fired", ranked[0]!.parts.founderMention > 0.9);
}

// ------------------------------------------------------------- disagreement
console.log("\n5. An unanswered challenge pulls the challenged party back in");
{
  // Fill the opening round first. Within a single phase each executive has
  // one turn, so a challenged CFO answers in cross-examination — which is
  // exactly what that phase is for.
  let transcript: MeetingTranscriptMessage[] = [];
  for (const id of SEATS) {
    transcript = [
      ...transcript,
      id === "cfo"
        ? msg("cfo", "The unit economics do not work. CAC payback is over 30 months.")
        : msg(id, "A first reaction to the pitch."),
    ];
  }
  check("opening round filled, now in cross-examination",
    currentPhase({ ...base, transcript }) === "cross_examination",
    String(currentPhase({ ...base, transcript })));

  // Théo challenges Marcus by name.
  transcript = [
    ...transcript,
    msg("growth", "I disagree with Marcus — the CFO is treating a launch cohort as steady state."),
  ];

  const ranked = scoreSpeakers({ ...base, transcript });
  const cfoEntry = ranked.find((r) => r.executiveId === "cfo");
  check("CFO is eligible to reply in cross-examination", Boolean(cfoEntry));
  check("challenged CFO has a non-zero disagreement score", (cfoEntry?.parts.disagreement ?? 0) > 0.5,
    `got ${cfoEntry?.parts.disagreement}`);

  // Same board, same phase, but nobody was challenged — isolates the effect.
  const noChallenge = [...transcript.slice(0, SEATS.length), msg("growth", "Retention is the number I watch.")];
  const baseline = scoreSpeakers({ ...base, transcript: noChallenge })
    .find((r) => r.executiveId === "cfo");
  check("disagreement measurably lifts the CFO's score",
    (cfoEntry?.score ?? 0) > (baseline?.score ?? 0),
    `challenged=${cfoEntry?.score?.toFixed(3)} baseline=${baseline?.score?.toFixed(3)}`);
}

// ------------------------------------------------------------------ fairness
console.log("\n6. Fairness and starvation");
{
  // A relentlessly technical session — without fairness+starvation guards the
  // CTO would monopolise it and other executives would never speak.
  let transcript: MeetingTranscriptMessage[] = [];
  const spoken: string[] = [];
  for (let i = 0; i < SEATS.length * 3; i += 1) {
    const next = pickNextSpeaker({ ...base, transcript });
    if (!next) break;
    spoken.push(next);
    transcript = [...transcript, msg(next, "Scaling, latency and infrastructure remain the bottleneck.")];
  }

  const counts = new Map<string, number>();
  for (const id of spoken) counts.set(id, (counts.get(id) ?? 0) + 1);
  console.log(`     turns each: ${SEATS.map((s) => `${s}=${counts.get(s) ?? 0}`).join(" ")}`);

  check("every executive spoke", SEATS.every((s) => (counts.get(s) ?? 0) > 0));
  check("everyone spoke exactly 3 times (1 per phase)",
    SEATS.every((s) => counts.get(s) === 3),
    JSON.stringify(Object.fromEntries(counts)));
  check("session terminates", spoken.length === SEATS.length * 3, `${spoken.length} turns`);

  let doubles = 0;
  for (let i = 1; i < spoken.length; i += 1) if (spoken[i] === spoken[i - 1]) doubles += 1;
  check("nobody speaks twice in a row", doubles === 0, `${doubles} back-to-back`);

  check("debate reports complete", isDebateComplete({ ...base, transcript }));
  check("no speaker after completion", pickNextSpeaker({ ...base, transcript }) === null);
}

// -------------------------------------------------------------------- phases
console.log("\n7. Phases");
{
  let transcript: MeetingTranscriptMessage[] = [];
  const phasesSeen: string[] = [];
  for (let i = 0; i < SEATS.length * 3; i += 1) {
    const phase = currentPhase({ ...base, transcript });
    if (!phase) break;
    if (phasesSeen[phasesSeen.length - 1] !== phase) phasesSeen.push(phase);
    const next = pickNextSpeaker({ ...base, transcript })!;
    transcript = [...transcript, msg(next, "A considered point about the business.")];
  }
  console.log(`     phase order: ${phasesSeen.join(" → ")}`);
  check("three phases in order",
    phasesSeen.join(",") === "opening,cross_examination,closing", phasesSeen.join(","));

  const progress = debateProgress({ ...base, transcript });
  check("progress totals 24 for 8 seats x 3 phases", progress.total === 24, `${progress.total}`);
  check("progress is complete", progress.spoken === 24, `${progress.spoken}`);

  const demo = { ...base, profile: PHASE_PROFILES.demo!, transcript: [] };
  check("demo profile plans 16 turns", debateProgress(demo).total === 16, `${debateProgress(demo).total}`);
}

// -------------------------------------------------------------------- memory
console.log("\n8. Executive memory");
{
  const transcript = [
    msg("cfo", "My concern is that customer acquisition cost is far too high for this stage of company."),
    msg("founder", "We think paid channels will get cheaper as the brand grows."),
    msg("growth", "I disagree with Marcus that CAC is the core problem here — retention is the leak underneath it."),
  ];
  const memory = buildBoardMemory({ transcript, seatedExecutiveIds: SEATS, identities: IDENTITIES });

  const cfo = memory.byExecutive.cfo!;
  check("CFO's own position is remembered", cfo.positionsTaken.length > 0, JSON.stringify(cfo.positionsTaken));
  check("CFO has an open challenge from Théo", cfo.openChallenges.length > 0,
    JSON.stringify(cfo.openChallenges));
  check("challenge is attributed to the right person",
    cfo.openChallenges[0]?.from === "Théo Marchand", cfo.openChallenges[0]?.from ?? "none");
  check("claims are on the table for others to engage", memory.keyClaims.length >= 2,
    `${memory.keyClaims.length}`);

  // The CFO answering should clear the challenge.
  const after = buildBoardMemory({
    transcript: [...transcript, msg("cfo", "Retention matters, but a 30-month payback is still fatal.")],
    seatedExecutiveIds: SEATS,
    identities: IDENTITIES,
  });
  check("answering clears the open challenge", after.byExecutive.cfo!.openChallenges.length === 0,
    JSON.stringify(after.byExecutive.cfo!.openChallenges));
}

console.log(failures === 0 ? "\nALL POLICY TESTS PASSED" : `\n${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
