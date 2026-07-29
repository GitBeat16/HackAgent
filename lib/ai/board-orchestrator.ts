import { generateExecutiveReply } from "@/lib/ai/client";
import { getPersona, executivePersonas } from "@/lib/ai/executives";
import { getExpertise } from "@/lib/ai/expertise";
import {
  currentPhase,
  isDebateComplete,
  pickNextSpeaker,
  resolvePhaseProfile,
  scoreSpeakers,
  PHASE_BRIEF,
  PHASE_LABEL,
  type DebatePhase,
  type SpeakerScore,
} from "@/lib/ai/debate-policy";
import { buildBoardMemory, founderQuestionIn, type BoardMemory } from "@/lib/ai/meeting-memory";
import { detectTopic, TOPIC_LABEL, type TopicReading } from "@/lib/ai/topics";
import { researchBriefFor, type ResearchBrief } from "@/lib/ai/research";
import { loadFindings, saveFindings } from "@/lib/server/research-store";
import { verifyAgainstEvidence, type VerificationResult } from "@/lib/ai/fact-check";
import type { MeetingTranscriptMessage } from "@/types/api";

// Turn-taking lives in `debate-policy.ts` so the boardroom UI can apply the
// identical rules — re-exported here for callers already importing this file.
export {
  isDebateComplete,
  pickNextSpeaker,
  currentPhase,
  debateProgress,
  scoreSpeakers,
} from "@/lib/ai/debate-policy";

export interface DebateState {
  meetingId: string;
  startupName: string;
  oneLiner?: string;
  industry?: string;
  stage?: string;
  pitch: string;
  seatedExecutiveIds: string[];
  transcript: MeetingTranscriptMessage[];
}

/** Display names for the seated board, used by mention and memory matching. */
function identitiesFor(seatedExecutiveIds: string[]) {
  const identities: Record<string, { name: string; role: string }> = {};
  for (const id of seatedExecutiveIds) {
    const persona = executivePersonas.find((candidate) => candidate.id === id);
    identities[id] = { name: persona?.name ?? id, role: persona?.role ?? "Executive" };
  }
  return identities;
}

function bullets(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

interface PromptContext {
  state: DebateState;
  speakerId: string;
  phase: DebatePhase;
  topic: TopicReading;
  memory: BoardMemory;
  research: ResearchBrief | null;
  identities: Record<string, { name: string; role: string }>;
}

/**
 * Builds the whole briefing an executive speaks from.
 *
 * The old version was persona + startup facts + "don't repeat anyone". That
 * produced eight people reading prepared statements into the same room,
 * because nothing in the prompt gave them anything specific to react *to*.
 *
 * Everything added below exists to force engagement: the claims on the table
 * are named and attributed so they can be agreed with or attacked by name;
 * the executive's own prior points are listed so repetition is a visible
 * failure rather than the path of least resistance; open challenges are
 * surfaced so a question put to them cannot quietly go unanswered.
 */
function buildSystemPrompt(context: PromptContext): string {
  const { state, speakerId, phase, topic, memory, research, identities } = context;
  const persona = getPersona(speakerId);
  const expertise = getExpertise(speakerId);
  const own = memory.byExecutive[speakerId];

  const sections: string[] = [
    persona.systemPrompt,
    "",
    `YOUR OBJECTIVE IN THIS MEETING: ${expertise.goal}`,
    "",
    "THE COMPANY",
    bullets(
      [
        `Startup: ${state.startupName}`,
        state.oneLiner ? `One-liner: ${state.oneLiner}` : null,
        state.industry ? `Industry: ${state.industry}` : null,
        state.stage ? `Stage: ${state.stage}` : null,
      ].filter((line): line is string => Boolean(line)),
    ),
    "",
    "THE FOUNDER'S PITCH",
    state.pitch,
    "",
    `MEETING PHASE: ${PHASE_LABEL[phase]}`,
    PHASE_BRIEF[phase],
    "",
    `WHAT THE ROOM IS ON RIGHT NOW: ${TOPIC_LABEL[topic.topic]}`,
  ];

  // --- who else is at the table, so colleagues can be addressed by name
  const others = state.seatedExecutiveIds
    .filter((id) => id !== speakerId)
    .map((id) => `${identities[id]!.name} (${identities[id]!.role})`);
  if (others.length) {
    sections.push("", "ALSO AT THE TABLE", bullets(others));
  }

  // --- the live argument
  if (memory.keyClaims.length) {
    sections.push(
      "",
      "CLAIMS CURRENTLY ON THE TABLE — engage with these by name",
      bullets(
        memory.keyClaims
          .filter((claim) => claim.executiveId !== speakerId)
          .map((claim) => `${claim.speaker} (${claim.role}) argued: "${claim.claim}"`),
      ),
    );
  }

  // --- their own history, to stop them restating it
  if (own?.positionsTaken.length) {
    sections.push(
      "",
      "YOU HAVE ALREADY MADE THESE POINTS — do not repeat them, build past them",
      bullets(own.positionsTaken),
    );
  }

  // --- challenges they owe an answer to
  if (own?.openChallenges.length) {
    sections.push(
      "",
      "YOU HAVE BEEN CHALLENGED AND HAVE NOT ANSWERED — answer this first",
      bullets(own.openChallenges.map((challenge) => `${challenge.from}: "${challenge.quote}"`)),
    );
  }

  // --- what the founder still owes the board
  if (memory.openFounderQuestions.length) {
    sections.push(
      "",
      "QUESTIONS THE FOUNDER HAS NOT ANSWERED",
      bullets(
        memory.openFounderQuestions.map((question) => `${question.from} asked: "${question.question}"`),
      ),
    );
  }

  // --- verified evidence, kept strictly separate from reasoning
  if (research?.findings.length) {
    sections.push(
      "",
      "VERIFIED EXTERNAL DATA — retrieved from real sources just now",
      bullets(research.findings.map((finding) => `${finding.claim} [source: ${finding.source}]`)),
      "",
      "Treat the above as fact and cite it as verified. Everything else you say is your own",
      "reasoning — if you estimate a number that is not in that list, say plainly that you are",
      "estimating. Never present an estimate as a retrieved figure.",
    );
  } else if (research) {
    sections.push(
      "",
      "NO VERIFIED EXTERNAL DATA IS AVAILABLE FOR THIS TURN.",
      "If you cite a market size, competitor or funding figure, state explicitly that it is your",
      "own estimate and not a verified source. Do not invent citations.",
    );
  }

  sections.push(
    "",
    "HOW TO SPEAK",
    bullets([
      "Speak only as yourself, in first person. Never narrate, never use stage directions, never prefix your name.",
      "Never write another executive's lines or speak on their behalf.",
      "Refer to colleagues by name when you agree or disagree with them.",
      "Take a position. Agreeing with everyone is worthless to the founder.",
      "Where you disagree, say what specifically you disagree with and why.",
      "Where you agree, add something — a condition, a consequence, or a sharper version of the point.",
      "Do not repeat a question that has already been asked.",
      "Stay under 4 sentences. Density beats length.",
    ]),
  );

  return sections.join("\n");
}

export interface AdvanceResult {
  message: MeetingTranscriptMessage | null;
  isComplete: boolean;
  /** Why this speaker was chosen — surfaced to the UI. */
  selection?: { phase: DebatePhase; topic: TopicReading; scores: SpeakerScore[] };
  /** Set when the turn ended on a question the founder should answer. */
  founderQuestion?: string;
}

export async function advanceDebate(
  state: DebateState,
  founderMessage?: string,
): Promise<AdvanceResult> {
  const profile = resolvePhaseProfile();
  const identities = identitiesFor(state.seatedExecutiveIds);
  const topic = detectTopic(state.transcript, founderMessage);

  const selectionInput = {
    seatedExecutiveIds: state.seatedExecutiveIds,
    transcript: state.transcript,
    identities,
    pendingFounderMessage: founderMessage,
    topic,
    profile,
  };

  const scores = scoreSpeakers(selectionInput);
  const nextSpeakerId = scores[0]?.executiveId ?? null;
  const phase = currentPhase({ ...selectionInput, profile });
  if (!nextSpeakerId || !phase) {
    return { message: null, isComplete: true };
  }

  const persona = getPersona(nextSpeakerId);
  const memory = buildBoardMemory({
    transcript: state.transcript,
    seatedExecutiveIds: state.seatedExecutiveIds,
    identities,
  });

  // Only the evidence-facing seats pay for a lookup, and only when the room
  // is on a subject where outside data exists to be checked. Anything this
  // meeting already retrieved is reused rather than re-queried.
  const known = await loadFindings(state.meetingId);
  const research = await researchBriefFor({
    executiveId: nextSpeakerId,
    topic: topic.topic,
    startupName: state.startupName,
    industry: state.industry,
    oneLiner: state.oneLiner,
    known: known.length ? known : undefined,
  });

  if (research?.findings.length && !known.length) {
    await saveFindings(
      state.meetingId,
      nextSpeakerId,
      research.queries[0] ?? "",
      research.findings,
    );
  }

  const conversation = [
    ...state.transcript
      .filter((m) => m.speakerId !== "system")
      .map((m) => ({
        role: (m.speakerId === "founder" ? "founder" : "executive") as "founder" | "executive",
        // Attribute other executives so the model can react to a specific
        // colleague rather than a wall of anonymous text.
        content: m.speakerId === "founder" ? m.message : `${m.speakerName} (${m.role}): ${m.message}`,
      })),
    ...(founderMessage?.trim() ? [{ role: "founder" as const, content: founderMessage.trim() }] : []),
  ];

  const replyText = await generateExecutiveReply({
    systemPrompt: buildSystemPrompt({
      state,
      speakerId: nextSpeakerId,
      phase,
      topic,
      memory,
      research,
      identities,
    }),
    conversation,
    phase,
  });

  // Check what was said against what was retrieved. The prompt asks the
  // executive to label estimates honestly; this is what enforces it — a
  // model handed a real market figure can still state a different one, and
  // without this the report would present both with equal confidence.
  const verification: VerificationResult | undefined = research
    ? verifyAgainstEvidence(replyText, research.findings)
    : undefined;

  const message: MeetingTranscriptMessage = {
    id: `msg_${crypto.randomUUID()}`,
    speakerId: persona.id,
    speakerName: persona.name,
    role: persona.role,
    message: replyText,
    createdAt: new Date().toISOString(),
    ...(verification?.checked ? { verification } : {}),
  };

  const complete = isDebateComplete({
    seatedExecutiveIds: state.seatedExecutiveIds,
    transcript: [...state.transcript, message],
    profile,
  });

  // Only worth pausing for while the board still has turns left — a question
  // asked on the final turn has nowhere to go but the report.
  const question = complete
    ? null
    : founderQuestionIn(message, state.seatedExecutiveIds, identities);

  return {
    message,
    isComplete: complete,
    selection: { phase, topic, scores: scores.slice(0, 4) },
    ...(question ? { founderQuestion: question } : {}),
  };
}

/** Builds the founder's own transcript entry so their replies persist too. */
export function founderMessage(content: string): MeetingTranscriptMessage {
  return {
    id: `msg_${crypto.randomUUID()}`,
    speakerId: "founder",
    speakerName: "You",
    role: "Founder",
    message: content.trim(),
    createdAt: new Date().toISOString(),
  };
}
