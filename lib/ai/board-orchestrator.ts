import { generateText } from "@/lib/ai/groq";
import { executivePersonas, getPersona } from "@/lib/ai/executives";
import type { MeetingTranscriptMessage } from "@/types/api";

export interface DebateState {
  meetingId: string;
  startupName: string;
  industry: string;
  oneLiner: string;
  pitch: string;
  seatedExecutiveIds: string[];
  transcript: MeetingTranscriptMessage[];
}

export interface AdvanceResult {
  message: MeetingTranscriptMessage | null;
  isComplete: boolean;
}

export async function advanceDebate(
  state: DebateState,
  founderMessage?: string,
): Promise<AdvanceResult> {
  // Simple turn-taking logic: cycle through the seated executives
  const turnIndex = state.transcript.filter(m => m.speakerId !== "founder").length;
  if (turnIndex >= state.seatedExecutiveIds.length * 2) { // 2 turns per executive max
    return { message: null, isComplete: true };
  }
  
  const nextSpeakerId = state.seatedExecutiveIds[turnIndex % state.seatedExecutiveIds.length];
  const persona = getPersona(nextSpeakerId!);
  
  const conversation = [
    ...state.transcript
      .filter((m) => m.speakerId !== "system")
      .map((m) => ({
        role: (m.speakerId === "founder" ? "user" : "assistant") as "user" | "assistant",
        content: m.speakerId === "founder" ? m.message : `${m.speakerName} (${m.role}): ${m.message}`,
      })),
    ...(founderMessage?.trim() ? [{ role: "user" as const, content: founderMessage.trim() }] : []),
  ];

  const systemPrompt = `You are ${persona.name}, ${persona.role}.
Your role: ${persona.role}
Pitch: ${state.pitch}
Review the pitch and debate its merits with the founder and colleagues. Keep it under 4 sentences.`;

  const replyText = await generateText({
    systemPrompt, turns: conversation,
    temperature: 0.7,
    maxOutputTokens: 200,
  });

  const message: MeetingTranscriptMessage = {
    id: `msg_${crypto.randomUUID()}`,
    speakerId: persona.id,
    speakerName: persona.name,
    role: persona.role,
    message: replyText || "I have no further questions.",
    createdAt: new Date().toISOString(),
  };

  const isComplete = turnIndex + 1 >= state.seatedExecutiveIds.length * 2;

  return {
    message,
    isComplete,
  };
}

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



