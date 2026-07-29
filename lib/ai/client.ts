/**
 * The one place the app turns a persona plus a transcript into spoken
 * dialogue. `board-orchestrator.ts` calls `generateExecutiveReply` once
 * per turn; nothing else in the app should reach for an AI client.
 *
 * Backed by Groq — see `lib/ai/groq.ts` for the transport and
 * `GROQ_API_KEY` / `GROQ_MODEL` in `.env.local` for configuration.
 */

import { generateText } from "@/lib/ai/groq";
import { serverEnv } from "@/lib/server/env";
import type { DebatePhase } from "@/lib/ai/debate-policy";

/**
 * How many prior transcript entries a speaker is shown.
 *
 * Sending the whole history made a session's cost quadratic: with eight
 * executives over two rounds, the sixteenth speaker re-sent the fifteen
 * turns before it, so the transcript alone accounted for ~120 message
 * transmissions across a session instead of 16. An executive only needs
 * the last few exchanges to build on or push back against a colleague —
 * the pitch itself is in the system prompt and never scrolls out of view.
 */
export const TRANSCRIPT_WINDOW = 6;

export interface ExecutiveReplyInput {
  /** Built from the executive's persona — see lib/ai/executives.ts. */
  systemPrompt: string;
  /** Prior transcript, oldest first. */
  conversation: Array<{ role: "founder" | "executive"; content: string }>;
  /** Shapes the token budget — cross-examination needs room to argue. */
  phase?: DebatePhase;
}

/**
 * The founder is the user; every other executive is prior assistant output.
 *
 * Unlike Gemini, Groq's chat API imposes no alternation rule and takes the
 * system prompt as its own message, so the transcript maps across directly —
 * only the trailing turn needs care, since a transcript ending on an
 * executive leaves the model nothing to answer.
 */
function toChatTurns(conversation: ExecutiveReplyInput["conversation"]) {
  const all = conversation.filter((message) => message.content.trim().length > 0);

  // Keep the tail, plus the founder's latest turn if the tail scrolled past
  // it — the founder is the one participant the board is answering to, so
  // dropping their interjection changes the reply rather than shortening it.
  const windowStart = Math.max(0, all.length - TRANSCRIPT_WINDOW);
  const lastFounderIndex = all.findLastIndex((message) => message.role === "founder");
  const kept =
    lastFounderIndex >= 0 && lastFounderIndex < windowStart
      ? [all[lastFounderIndex]!, ...all.slice(windowStart)]
      : all.slice(windowStart);

  const turns = kept.map((message) => ({
    role: message.role === "founder" ? ("user" as const) : ("assistant" as const),
    content: message.content.trim(),
  }));

  if (!turns.length || turns[turns.length - 1]!.role === "assistant") {
    turns.push({
      role: "user",
      content: turns.length
        ? "Your turn — respond to what the board has raised so far."
        : "Here is the pitch. Take your turn.",
    });
  }

  return turns;
}

/**
 * Output ceiling per phase.
 *
 * Cross-examination is the one round that legitimately needs more room: an
 * executive has to name whose reasoning they doubt, say what specifically is
 * wrong with it, and put a question. Capped at the old 160 that came out as
 * a truncated first clause. Opening and closing stay tight — density is the
 * point, and output tokens are the scarce half of Groq's per-minute budget.
 */
const PHASE_TOKEN_BUDGET: Record<DebatePhase, number> = {
  opening: 180,
  cross_examination: 260,
  closing: 200,
};

export async function generateExecutiveReply(input: ExecutiveReplyInput): Promise<string> {
  return generateText({
    systemPrompt: input.systemPrompt,
    turns: toChatTurns(input.conversation),
    model: serverEnv.groqDebateModel,
    maxOutputTokens: PHASE_TOKEN_BUDGET[input.phase ?? "opening"],
    // High enough that eight personas don't converge on one voice, low
    // enough that they stay on the argument in front of them.
    temperature: 0.85,
  });
}
