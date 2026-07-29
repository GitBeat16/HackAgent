/**
 * What the room remembers.
 *
 * An executive's memory is *derived from the transcript*, never stored. The
 * transcript is already the single source of truth for a session, so a
 * parallel memory table could only ever disagree with it — and would need
 * writing on every turn, doubling the failure surface of a debate that
 * already has to survive a rate-limited model.
 *
 * Extraction is deterministic string work rather than a summarisation call.
 * Memory is rebuilt before every turn; an LLM pass here would add a request
 * per turn purely to restate text we already hold.
 *
 * Keep this file free of server-only imports.
 */

import type { MeetingTranscriptMessage } from "@/types/api";
import { addressTerms } from "@/lib/ai/debate-policy";
import { detectTopic, type DebateTopic } from "@/lib/ai/topics";

export interface ExecutiveMemory {
  executiveId: string;
  /** Points this executive has already made — the anti-repetition list. */
  positionsTaken: string[];
  /** Questions they asked that nobody has picked up. */
  unansweredQuestions: string[];
  /** Challenges aimed at them they have not yet answered. */
  openChallenges: Array<{ from: string; quote: string }>;
  /** Topics they have already spoken to. */
  topicsCovered: DebateTopic[];
}

export interface BoardMemory {
  byExecutive: Record<string, ExecutiveMemory>;
  /** The strongest claim each executive has put on the table, newest first. */
  keyClaims: Array<{ executiveId: string; speaker: string; role: string; claim: string }>;
  /** Questions put to the founder that the founder has not answered. */
  openFounderQuestions: Array<{ from: string; question: string }>;
}

const CHALLENGE_MARKERS = [
  "disagree", "not convinced", "pushback", "push back", "challenge", "doubt",
  "however", "that assumes", "assumption", "why do you", "how do you",
  "justify", "unconvinced", "overstates", "understates", "too optimistic",
  "sceptical", "skeptical", "i'd argue", "i would argue",
];

/** Filler openers that carry no position and pollute the memory list. */
const LOW_SIGNAL = [
  "let's get to it", "let me start", "thanks", "thank you", "good morning",
  "to be clear", "first of all", "i'll be brief", "let me be direct",
];

function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function isQuestion(sentence: string) {
  return sentence.trimEnd().endsWith("?");
}

function containsAny(haystack: string, needles: string[]) {
  const text = haystack.toLowerCase();
  return needles.some((needle) => text.includes(needle));
}

/**
 * The most substantive statement in a message.
 *
 * Longest declarative sentence, which in practice is the one carrying the
 * actual position — openers and sign-offs are short, the argument is not.
 */
function keyClaimOf(message: string): string | null {
  const candidates = sentences(message)
    .filter((sentence) => !isQuestion(sentence))
    .filter((sentence) => sentence.length > 40)
    .filter((sentence) => !containsAny(sentence, LOW_SIGNAL));
  if (candidates.length === 0) return null;
  return candidates.reduce((longest, sentence) => (sentence.length > longest.length ? sentence : longest));
}

function condense(sentence: string, max = 180) {
  const clean = sentence.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The question an executive just put to the founder, if they put one.
 *
 * Distinguishing "a question for the founder" from "a question for a
 * colleague" is the whole job here — cross-examination is full of questions
 * aimed at other executives, and pausing the debate for those would stall the
 * meeting on every turn of the middle phase.
 *
 * The rule: it is for the founder when the question does not name a seated
 * colleague. A question naming Marcus is Marcus's to answer.
 */
export function founderQuestionIn(
  message: MeetingTranscriptMessage,
  seatedExecutiveIds: string[],
  identities: Record<string, { name: string; role: string }>,
): string | null {
  const questions = sentences(message.message).filter(isQuestion);
  if (questions.length === 0) return null;

  // The last question is the one left hanging in the room.
  for (const question of [...questions].reverse()) {
    const lower = question.toLowerCase();
    const namesColleague = seatedExecutiveIds.some((id) => {
      if (id === message.speakerId) return false;
      const identity = identities[id] ?? { name: id, role: "Executive" };
      return addressTerms(id, identity.name, identity.role).some((term) => lower.includes(term));
    });
    if (!namesColleague) return condense(question, 220);
  }
  return null;
}

export interface MemoryInput {
  transcript: MeetingTranscriptMessage[];
  seatedExecutiveIds: string[];
  identities: Record<string, { name: string; role: string }>;
}

/**
 * How many of an executive's own prior points to carry forward.
 *
 * Capped because the whole memory block rides in the system prompt on every
 * turn. Unbounded, a long session would spend more of its token budget
 * reminding an executive what they said than letting them say anything new.
 */
const MAX_POSITIONS = 4;
const MAX_KEY_CLAIMS = 6;

export function buildBoardMemory(input: MemoryInput): BoardMemory {
  const { transcript, seatedExecutiveIds, identities } = input;
  const relevant = transcript.filter((message) => message.speakerId !== "system");

  const byExecutive: Record<string, ExecutiveMemory> = {};
  for (const id of seatedExecutiveIds) {
    byExecutive[id] = {
      executiveId: id,
      positionsTaken: [],
      unansweredQuestions: [],
      openChallenges: [],
      topicsCovered: [],
    };
  }

  // Index of each executive's most recent turn — anything aimed at them
  // before that has already had its chance to be answered.
  const lastTurnIndex = new Map<string, number>();
  relevant.forEach((message, index) => {
    if (byExecutive[message.speakerId]) lastTurnIndex.set(message.speakerId, index);
  });
  const lastFounderIndex = relevant.map((m) => m.speakerId).lastIndexOf("founder");

  const keyClaims: BoardMemory["keyClaims"] = [];
  const openFounderQuestions: BoardMemory["openFounderQuestions"] = [];

  relevant.forEach((message, index) => {
    const memory = byExecutive[message.speakerId];

    if (memory) {
      // --- their own positions, for the anti-repetition instruction
      const claim = keyClaimOf(message.message);
      if (claim) {
        memory.positionsTaken.push(condense(claim));
        keyClaims.push({
          executiveId: message.speakerId,
          speaker: message.speakerName,
          role: message.role,
          claim: condense(claim),
        });
      }

      const reading = detectTopic([message]);
      if (reading.topic !== "general" && !memory.topicsCovered.includes(reading.topic)) {
        memory.topicsCovered.push(reading.topic);
      }

      // --- questions they put to the founder, still open if the founder has
      // not spoken since.
      for (const sentence of sentences(message.message)) {
        if (!isQuestion(sentence)) continue;
        const answered = lastFounderIndex > index;
        if (!answered) {
          memory.unansweredQuestions.push(condense(sentence));
          openFounderQuestions.push({ from: message.speakerName, question: condense(sentence) });
        }
      }
    }

    // --- challenges: this message names another seated executive and carries
    // a disagreement marker. Open only if the target has not spoken since.
    if (!containsAny(message.message, CHALLENGE_MARKERS)) return;
    for (const targetId of seatedExecutiveIds) {
      if (targetId === message.speakerId) continue;
      const identity = identities[targetId] ?? { name: targetId, role: "Executive" };
      const terms = addressTerms(targetId, identity.name, identity.role);
      const named = terms.some((term) => message.message.toLowerCase().includes(term));
      if (!named) continue;
      if ((lastTurnIndex.get(targetId) ?? -1) > index) continue;

      const quote =
        sentences(message.message).find(
          (sentence) =>
            terms.some((term) => sentence.toLowerCase().includes(term)) ||
            containsAny(sentence, CHALLENGE_MARKERS),
        ) ?? message.message;
      byExecutive[targetId]!.openChallenges.push({
        from: message.speakerName,
        quote: condense(quote),
      });
    }
  });

  for (const memory of Object.values(byExecutive)) {
    // Keep the most recent points; the oldest are the least likely to still
    // be live in the argument.
    memory.positionsTaken = memory.positionsTaken.slice(-MAX_POSITIONS);
    memory.unansweredQuestions = memory.unansweredQuestions.slice(-3);
    memory.openChallenges = memory.openChallenges.slice(-3);
  }

  return {
    byExecutive,
    keyClaims: keyClaims.slice(-MAX_KEY_CLAIMS).reverse(),
    openFounderQuestions: openFounderQuestions.slice(-4),
  };
}
