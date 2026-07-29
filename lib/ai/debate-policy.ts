/**
 * Turn-taking for a board session.
 *
 * Deliberately free of any server-only import: the boardroom UI needs the
 * same answers as the route handler (who speaks next, which phase we are in,
 * how far through the session we are), and duplicating the policy is how the
 * two drift apart.
 *
 * The rule used to be "whoever has spoken least". That produced a rota, not a
 * meeting — the founder could say "our model cannot scale" and the next
 * speaker would be whoever happened to be up, which is exactly what made the
 * board feel like eight prompts in a trench coat. Selection is now scored, so
 * the CTO takes that question and the CFO waits.
 */

import type { MeetingTranscriptMessage } from "@/types/api";
import { detectTopic, type DebateTopic, type TopicReading } from "@/lib/ai/topics";
import { getExpertise, topicAuthority } from "@/lib/ai/expertise";

// ---- Phases ---------------------------------------------------------------

/**
 * A real board meeting has movements, and each one asks a different thing of
 * the room: react, interrogate each other, then commit.
 */
export type DebatePhase = "opening" | "cross_examination" | "closing";

export const DEBATE_PHASES: readonly DebatePhase[] = ["opening", "cross_examination", "closing"] as const;

export interface PhaseProfile {
  /** Turns each seated executive takes in each phase. 0 skips the phase. */
  turnsPerExecutive: Record<DebatePhase, number>;
}

/**
 * Named profiles, because session length is a demo constraint as much as a
 * product one. `full` is the real thing; `demo` drops closing statements to
 * land a session at roughly the length the old two-round format ran, while
 * keeping the cross-examination that makes the board look like a board.
 */
export const PHASE_PROFILES: Record<string, PhaseProfile> = {
  full: { turnsPerExecutive: { opening: 1, cross_examination: 1, closing: 1 } },
  demo: { turnsPerExecutive: { opening: 1, cross_examination: 1, closing: 0 } },
  deep: { turnsPerExecutive: { opening: 2, cross_examination: 2, closing: 1 } },
};

export const DEFAULT_PHASE_PROFILE = "full";

/**
 * Resolved from `NEXT_PUBLIC_DEBATE_PROFILE` so the client and the route
 * handler agree without another round-trip. Unknown values fall back rather
 * than throwing — a typo in `.env.local` should not take the board down.
 */
export function resolvePhaseProfile(name?: string): PhaseProfile {
  const key = (name ?? process.env.NEXT_PUBLIC_DEBATE_PROFILE ?? DEFAULT_PHASE_PROFILE).trim();
  return PHASE_PROFILES[key] ?? PHASE_PROFILES[DEFAULT_PHASE_PROFILE]!;
}

export const PHASE_LABEL: Record<DebatePhase, string> = {
  opening: "Opening statements",
  cross_examination: "Cross-examination",
  closing: "Final positions",
};

/** What the prompt tells an executive this phase is for. */
export const PHASE_BRIEF: Record<DebatePhase, string> = {
  opening:
    "This is the opening round. Give your first read on the pitch from your own seat. Raise the one thing that most concerns you.",
  cross_examination:
    "This is cross-examination. Do not restate your opening. Put a direct question to a named colleague whose reasoning you doubt, or answer one that was put to you. Disagreement is the point of this round.",
  closing:
    "This is your final position before the vote. State where you landed, what changed your mind if anything, and the single condition that would move you.",
};

// ---- Turn accounting ------------------------------------------------------

/** Transcript entries the founder or the app produced, not an executive. */
const NON_EXECUTIVE_SPEAKERS = new Set(["founder", "system"]);

export interface DebateProgressInput {
  seatedExecutiveIds: string[];
  transcript: MeetingTranscriptMessage[];
  /** Defaults to the env-resolved profile. Injectable for tests. */
  profile?: PhaseProfile;
}

function executiveTurns(transcript: MeetingTranscriptMessage[]) {
  return transcript.filter((message) => !NON_EXECUTIVE_SPEAKERS.has(message.speakerId));
}

/** Total executive turns planned for a phase. */
function phaseCapacity(seats: number, profile: PhaseProfile, phase: DebatePhase) {
  return seats * profile.turnsPerExecutive[phase];
}

/** Turns taken so far, keyed by executive id. Seated-but-silent ids map to 0. */
export function turnCounts({ seatedExecutiveIds, transcript }: DebateProgressInput) {
  const counts = new Map<string, number>(seatedExecutiveIds.map((id) => [id, 0]));
  for (const message of executiveTurns(transcript)) {
    const current = counts.get(message.speakerId);
    if (current !== undefined) counts.set(message.speakerId, current + 1);
  }
  return counts;
}

/**
 * Which phase the session is in, derived from the transcript rather than
 * stored.
 *
 * Derived state cannot disagree with the transcript, which matters because
 * the client and the server both compute it. A `phase` column would need
 * writing on every turn and would be wrong the moment a write failed.
 */
export function currentPhase(state: DebateProgressInput): DebatePhase | null {
  const profile = state.profile ?? resolvePhaseProfile();
  const seats = state.seatedExecutiveIds.length;
  if (seats === 0) return null;

  let spoken = executiveTurns(state.transcript).filter((message) =>
    state.seatedExecutiveIds.includes(message.speakerId),
  ).length;

  for (const phase of DEBATE_PHASES) {
    const capacity = phaseCapacity(seats, profile, phase);
    if (capacity === 0) continue;
    if (spoken < capacity) return phase;
    spoken -= capacity;
  }
  return null;
}

/** Turns each executive has taken *within the current phase*. */
function phaseTurnCounts(state: DebateProgressInput, phase: DebatePhase) {
  const profile = state.profile ?? resolvePhaseProfile();
  const seats = state.seatedExecutiveIds.length;
  const seated = new Set(state.seatedExecutiveIds);

  let offset = 0;
  for (const candidate of DEBATE_PHASES) {
    if (candidate === phase) break;
    offset += phaseCapacity(seats, profile, candidate);
  }

  const counts = new Map<string, number>(state.seatedExecutiveIds.map((id) => [id, 0]));
  const turns = executiveTurns(state.transcript).filter((message) => seated.has(message.speakerId));
  for (const message of turns.slice(offset)) {
    counts.set(message.speakerId, (counts.get(message.speakerId) ?? 0) + 1);
  }
  return counts;
}

// ---- Scoring --------------------------------------------------------------

/**
 * Weights, as specified. They sum to 1 so a score is readable as 0–1.
 *
 * Relevance dominates by design: the whole point is that the right person
 * answers the question in front of the room. Fairness is the counterweight
 * that stops a single-topic session becoming the CTO show.
 *
 * Nothing here guarantees everyone speaks, and nothing needs to: eligibility
 * filtering does that structurally. See the note in `scoreSpeakers`.
 */
export const SPEAKER_WEIGHTS = {
  relevance: 0.45,
  fairness: 0.2,
  founderMention: 0.15,
  disagreement: 0.1,
  priority: 0.1,
} as const;

/** Subtracted from the final score; not part of the weighted sum. */
const RECENCY_PENALTY = 0.3;

/** How many turns back a founder mention still pulls a speaker forward. */
const MENTION_WINDOW = 3;

/** Markers that make a message a challenge rather than a passing reference. */
const CHALLENGE_MARKERS = [
  "disagree", "not convinced", "pushback", "push back", "challenge", "wrong",
  "doubt", "however", "but i", "that assumes", "assumption", "why do you",
  "how do you", "justify", "explain", "unconvinced", "overstates", "understates",
  "too optimistic", "sceptical", "skeptical",
];

export interface SpeakerScore {
  executiveId: string;
  score: number;
  /** Component breakdown, surfaced for the UI and for explaining the pick. */
  parts: {
    relevance: number;
    fairness: number;
    founderMention: number;
    disagreement: number;
    priority: number;
    recencyPenalty: number;
  };
}

/** Whole-word, case-insensitive check for any of `needles` in `haystack`. */
function mentionsAny(haystack: string, needles: string[]): boolean {
  const text = ` ${haystack.toLowerCase()} `;
  return needles.some((needle) => {
    const term = needle.toLowerCase();
    const at = text.indexOf(term);
    if (at === -1) return false;
    const before = text[at - 1] ?? " ";
    const after = text[at + term.length] ?? " ";
    return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
  });
}

/** Names the founder might plausibly use for this executive. */
export function addressTerms(executiveId: string, name: string, role: string): string[] {
  const [first, ...rest] = name.split(/\s+/);
  return [
    executiveId,
    ...(first ? [first] : []),
    ...(rest.length ? [rest.join(" ")] : []),
    role,
    role.replace(/\s*Agent$/i, ""),
    ...getExpertise(executiveId).aliases,
  ]
    .filter(Boolean)
    .map((term) => term.toLowerCase());
}

export interface SpeakerSelectionInput extends DebateProgressInput {
  /** Display names/roles by id, so mentions can match on names not just ids. */
  identities: Record<string, { name: string; role: string }>;
  /** Founder message not yet persisted — the newest thing said. */
  pendingFounderMessage?: string;
  /** Pre-computed to avoid detecting twice per turn. */
  topic?: TopicReading;
}

/**
 * Scores every eligible executive and returns them best-first.
 *
 * Exported so the UI can show *why* someone has the floor. That explanation
 * is most of what makes this look like orchestration rather than a shuffle.
 */
export function scoreSpeakers(input: SpeakerSelectionInput): SpeakerScore[] {
  const profile = input.profile ?? resolvePhaseProfile();
  const phase = currentPhase({ ...input, profile });
  if (!phase) return [];

  const allowance = profile.turnsPerExecutive[phase];
  const inPhase = phaseTurnCounts({ ...input, profile }, phase);
  const totals = turnCounts({ ...input, profile });
  const topic = input.topic ?? detectTopic(input.transcript, input.pendingFounderMessage);

  const execTurns = executiveTurns(input.transcript);
  const lastSpeakerId = execTurns[execTurns.length - 1]?.speakerId ?? null;
  const secondLastSpeakerId = execTurns[execTurns.length - 2]?.speakerId ?? null;

  // Founder messages that could be addressing someone, newest last.
  const founderMessages = [
    ...input.transcript.filter((message) => message.speakerId === "founder"),
    ...(input.pendingFounderMessage?.trim()
      ? [{ message: input.pendingFounderMessage } as MeetingTranscriptMessage]
      : []),
  ].slice(-MENTION_WINDOW);

  const eligible = input.seatedExecutiveIds.filter((id) => (inPhase.get(id) ?? 0) < allowance);
  if (eligible.length === 0) return [];

  const maxTotal = Math.max(1, ...[...totals.values()]);

  const scored = eligible.map<SpeakerScore>((executiveId) => {
    const identity = input.identities[executiveId] ?? { name: executiveId, role: "Executive" };
    const terms = addressTerms(executiveId, identity.name, identity.role);

    // --- relevance: authority on the current topic, damped by how sure we
    // are it *is* the topic. A weak read should not override fairness.
    const authority = topicAuthority(executiveId, topic.topic);
    const relevance = topic.topic === "general"
      ? 0.5
      : 0.5 + (authority - 0.5) * Math.max(0.35, topic.confidence);

    // --- fairness: under-spoken executives rise. Measured across the whole
    // session, not the phase, so someone quiet in round one is pulled
    // forward in round two.
    const spokenTotal = totals.get(executiveId) ?? 0;
    const fairness = 1 - spokenTotal / maxTotal;

    // --- founder mention: being named is close to being handed the floor,
    // decaying as the conversation moves past it.
    let founderMention = 0;
    founderMessages.forEach((message, index) => {
      if (!mentionsAny(message.message, terms)) return;
      const age = founderMessages.length - 1 - index;
      founderMention = Math.max(founderMention, 1 - age * 0.35);
    });

    // --- disagreement: someone challenged this person by name since they
    // last spoke, and they have not yet answered. A board where challenges
    // go unanswered is a board reading statements aloud.
    let disagreement = 0;
    const lastOwnTurnAt = execTurns.map((m) => m.speakerId).lastIndexOf(executiveId);
    execTurns.forEach((message, index) => {
      if (index <= lastOwnTurnAt) return;
      if (message.speakerId === executiveId) return;
      if (!mentionsAny(message.message, terms)) return;
      if (!mentionsAny(message.message, CHALLENGE_MARKERS)) return;
      const age = execTurns.length - 1 - index;
      disagreement = Math.max(disagreement, 1 - age * 0.25);
    });

    const priority = getExpertise(executiveId).priority;

    // --- recency: nobody speaks twice in a row, and speaking two turns ago
    // still costs you. Hard-blocked below; the penalty shapes the rest.
    let recencyPenalty = 0;
    if (executiveId === lastSpeakerId) recencyPenalty = 1;
    else if (executiveId === secondLastSpeakerId) recencyPenalty = 0.4;

    const base =
      SPEAKER_WEIGHTS.relevance * relevance +
      SPEAKER_WEIGHTS.fairness * clamp01(fairness) +
      SPEAKER_WEIGHTS.founderMention * clamp01(founderMention) +
      SPEAKER_WEIGHTS.disagreement * clamp01(disagreement) +
      SPEAKER_WEIGHTS.priority * priority;

    return {
      executiveId,
      score: base - RECENCY_PENALTY * recencyPenalty,
      parts: {
        relevance: round2(relevance),
        fairness: round2(clamp01(fairness)),
        founderMention: round2(clamp01(founderMention)),
        disagreement: round2(clamp01(disagreement)),
        priority: round2(priority),
        recencyPenalty: round2(recencyPenalty),
      },
    };
  });

  /*
    There is deliberately no starvation guard here.

    An earlier version added +10 to anyone "owed" a turn, on the theory that a
    soft fairness weight could not guarantee everyone speaks. It could not
    fire selectively: `eligible` already excludes anyone at their allowance,
    so with one turn per executive per phase the owed set always equalled the
    eligible set and every score was inflated by 10 — which made the scoring
    unreadable in the UI and hid the real ranking.

    It was also unnecessary. A phase ends only once the transcript holds
    `seats × allowance` executive turns, and only under-allowance executives
    can contribute them, so every executive reaches their allowance by
    construction. Eligibility filtering *is* the guarantee.
  */

  return scored.sort((a, b) =>
    b.score === a.score
      ? input.seatedExecutiveIds.indexOf(a.executiveId) - input.seatedExecutiveIds.indexOf(b.executiveId)
      : b.score - a.score,
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Whoever scores highest. Returns null once the session is out of turns.
 *
 * Kept as the same name and shape the old rota used, so every call site —
 * the route handler, the boardroom loop, the finalize check — carries on
 * working without touching them.
 */
export function pickNextSpeaker(input: SpeakerSelectionInput): string | null {
  return scoreSpeakers(input)[0]?.executiveId ?? null;
}

/** True once every seated executive has taken all of their turns. */
export function isDebateComplete(state: DebateProgressInput) {
  return currentPhase(state) === null;
}

/** Turns taken out of turns planned, for the session progress readout. */
export function debateProgress(state: DebateProgressInput) {
  const profile = state.profile ?? resolvePhaseProfile();
  const seats = state.seatedExecutiveIds.length;
  const seated = new Set(state.seatedExecutiveIds);
  const total = DEBATE_PHASES.reduce((sum, phase) => sum + phaseCapacity(seats, profile, phase), 0);
  const spoken = executiveTurns(state.transcript).filter((message) => seated.has(message.speakerId)).length;
  return { spoken: Math.min(spoken, total), total, phase: currentPhase({ ...state, profile }) };
}

/** Re-exported so callers need only one import for turn-taking concerns. */
export type { DebateTopic };
