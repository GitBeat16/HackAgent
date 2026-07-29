/**
 * What each executive is *for*.
 *
 * Split out of `executives.ts` so the boardroom UI can score speaker
 * selection without pulling eight system prompts into the client bundle —
 * the prompts are server-only payload, these weights are shared policy.
 *
 * Keep this file free of server-only imports.
 */

import type { DebateTopic, ScoredTopic } from "@/lib/ai/topics";

export interface ExecutiveExpertise {
  /**
   * 0–1 authority per topic. Read as "how much does the board want to hear
   * from this person when the room is on this subject".
   *
   * Every executive keeps a non-zero floor on every topic, because a board
   * member with literally nothing to say on burn rate is not a board member.
   * The floor is what lets a CMO push back on a CFO's assumption instead of
   * being silently disqualified from the argument.
   */
  topics: Record<ScoredTopic, number>;
  /**
   * 0–1 standing tiebreak. The chair and the lead investor speak marginally
   * more often than specialists when nothing else separates them.
   */
  priority: number;
  /** What this executive is trying to establish. Injected into the prompt. */
  goal: string;
  /**
   * Extra spellings the founder might use to address them, beyond first
   * name, surname and role. Lower-cased, matched as whole words.
   */
  aliases: string[];
}

export const executiveExpertise: Record<string, ExecutiveExpertise> = {
  ceo: {
    topics: { technical: 0.35, financial: 0.45, market: 0.5, growth: 0.45, legal: 0.3, strategy: 1.0 },
    priority: 0.9,
    goal: "Force a single clear thesis out of the founder and judge whether execution risk is survivable.",
    aliases: ["chair", "chief executive"],
  },
  cto: {
    topics: { technical: 1.0, financial: 0.3, market: 0.25, growth: 0.3, legal: 0.3, strategy: 0.5 },
    priority: 0.6,
    goal: "Establish whether this can actually be built and shipped by this team on this timeline.",
    aliases: ["tech", "technical lead", "engineering"],
  },
  cfo: {
    topics: { technical: 0.25, financial: 1.0, market: 0.45, growth: 0.5, legal: 0.35, strategy: 0.45 },
    priority: 0.65,
    goal: "Pressure-test the model against a worst-case runway and find the number that breaks it.",
    aliases: ["finance", "chief financial"],
  },
  cmo: {
    topics: { technical: 0.2, financial: 0.4, market: 0.6, growth: 0.95, legal: 0.25, strategy: 0.5 },
    priority: 0.5,
    goal: "Find out whether the story is repeatable by a customer and whether the channel is real.",
    aliases: ["marketing", "chief marketing"],
  },
  vc: {
    topics: { technical: 0.3, financial: 0.8, market: 0.85, growth: 0.55, legal: 0.4, strategy: 0.7 },
    priority: 0.85,
    goal: "Decide whether this clears the bar for a real round, using comparables and honest odds.",
    aliases: ["investor", "venture", "fund"],
  },
  legal: {
    topics: { technical: 0.3, financial: 0.3, market: 0.3, growth: 0.2, legal: 1.0, strategy: 0.35 },
    priority: 0.45,
    goal: "Surface the regulatory or IP exposure that would block diligence before it is discovered late.",
    aliases: ["counsel", "compliance", "lawyer"],
  },
  research: {
    topics: { technical: 0.4, financial: 0.45, market: 1.0, growth: 0.45, legal: 0.35, strategy: 0.4 },
    priority: 0.55,
    goal: "Check the founder's claims against outside evidence and name anything unverified.",
    aliases: ["analyst", "data"],
  },
  growth: {
    topics: { technical: 0.3, financial: 0.5, market: 0.5, growth: 1.0, legal: 0.2, strategy: 0.4 },
    priority: 0.5,
    goal: "Get past vanity metrics to the retention curve underneath the growth story.",
    aliases: ["retention", "product growth"],
  },
};

/** Neutral profile for an id with no declared expertise — never disqualified. */
export const DEFAULT_EXPERTISE: ExecutiveExpertise = {
  topics: { technical: 0.5, financial: 0.5, market: 0.5, growth: 0.5, legal: 0.5, strategy: 0.5 },
  priority: 0.5,
  goal: "Evaluate the pitch on its merits.",
  aliases: [],
};

export function getExpertise(executiveId: string): ExecutiveExpertise {
  return executiveExpertise[executiveId] ?? DEFAULT_EXPERTISE;
}

/**
 * Authority on the current topic, 0–1.
 *
 * `general` returns a flat 0.5 rather than 0: when the room isn't on any
 * particular subject, relevance should stop discriminating and let fairness
 * and priority decide, instead of handing the floor to whoever happens to
 * top an arbitrary column.
 */
export function topicAuthority(executiveId: string, topic: DebateTopic): number {
  if (topic === "general") return 0.5;
  return getExpertise(executiveId).topics[topic];
}
