/**
 * Turns a finished debate into the board's verdict: a per-executive vote
 * and the full report the `/reports/[id]` screen renders.
 *
 * Everything the model returns is normalised before it leaves this file.
 * The report UI indexes straight into lookup tables by SWOT title, verdict
 * and risk level, so an off-schema string would crash the page rather than
 * degrade — the normalisers below are what make that safe.
 */

import { generateJson, type JsonSchema } from "@/lib/ai/groq";
import { executivePersonas, getPersona } from "@/lib/ai/executives";
import type {
  ConfidenceBreakdown,
  ConsensusPoint,
  DisagreementPoint,
  ExecutiveVoteDetail,
  ReportDetail,
  ReportSource,
  RiskRow,
  RiskTimelineEntry,
  RoadmapStep,
  SwotSection,
} from "@/features/reports/types";
import type { MeetingTranscriptMessage } from "@/types/api";

export type BoardVote = "yes" | "no" | "conditional";

export interface GeneratedVerdict {
  votes: ExecutiveVoteDetail[];
  report: Omit<ReportDetail, "id" | "generatedAt">;
}

const SWOT_TITLES = ["Strengths", "Weaknesses", "Opportunities", "Threats"] as const;
const LEVELS = ["Low", "Medium", "High"] as const;
const VERDICTS = ["Strong buy", "Conditional", "Pass"] as const;
const VOTES = ["yes", "no", "conditional"] as const;
/** Fixed axes so the radar chart is comparable across reports. */
const DIMENSIONS = ["Team", "Product", "Market", "Financials", "Traction"] as const;
const HORIZONS = ["Now", "6 months", "12 months", "24 months"] as const;
const PRIORITIES = ["Immediate", "Near-term", "Later"] as const;

interface RawVerdict {
  investmentScore?: number;
  verdict?: string;
  executiveSummary?: string;
  swot?: Array<{ title?: string; items?: string[] }>;
  dimensions?: Array<{ dimension?: string; score?: number }>;
  risks?: Array<{ risk?: string; likelihood?: string; impact?: string }>;
  financials?: Array<{ label?: string; value?: string }>;
  votes?: Array<{
    executiveId?: string;
    vote?: string;
    rationale?: string;
    confidence?: number;
    biggestRisk?: string;
    biggestStrength?: string;
    requiredMilestone?: string;
    chequeSize?: string;
    returnHorizon?: string;
  }>;
}

/**
 * The deeper analysis, requested separately from the verdict.
 *
 * Split into a second call on purpose. Asking one call for the verdict, eight
 * six-field votes *and* the consensus map reliably blew the output budget: the
 * model would truncate mid-array and `generateJson` would throw on malformed
 * JSON, losing the whole session's write-up. Two smaller schema-constrained
 * calls each fit comfortably, and — the part that matters — the second one is
 * allowed to fail without taking the report with it.
 */
interface RawAnalysis {
  investmentReadiness?: number;
  confidence?: {
    overall?: number;
    market?: number;
    technology?: number;
    financial?: number;
    founder?: number;
  };
  consensus?: Array<{ point?: string; executives?: string[] }>;
  disagreements?: Array<{
    topic?: string;
    positionA?: { summary?: string; executives?: string[] };
    positionB?: { summary?: string; executives?: string[] };
  }>;
  mostConvincingArgument?: { executive?: string; argument?: string };
  weakestFounderAnswer?: { question?: string; whyWeak?: string };
  riskTimeline?: Array<{ horizon?: string; risk?: string }>;
  nextSteps?: string[];
  roadmap?: Array<{ title?: string; detail?: string; priority?: string }>;
}

/**
 * Built per request so `votes[].executiveId` can be constrained to the ids
 * actually seated. Left as a free string, the model reliably answers with
 * the executive's *name* instead, which no id lookup would match.
 */
function buildVerdictSchema(seatedExecutiveIds: string[]): JsonSchema {
  return {
    type: "object",
    properties: {
      investmentScore: {
        type: "integer",
        description:
          "Overall investability, 0-100. Be discriminating: 80+ is rare and means genuinely fundable.",
      },
      verdict: { type: "string", enum: [...VERDICTS] },
      executiveSummary: {
        type: "string",
        description:
          "3-5 sentences addressed to the founder, summarising what the board concluded and the single biggest thing to fix.",
      },
      swot: {
        type: "array",
        description:
          "Exactly four entries, one per title, each with 2-4 specific items drawn from the debate.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", enum: [...SWOT_TITLES] },
            items: { type: "array", items: { type: "string" } },
          },
          required: ["title", "items"],
        },
      },
      dimensions: {
        type: "array",
        description: "Exactly five entries, one per named dimension, each scored 0-100.",
        items: {
          type: "object",
          properties: {
            dimension: { type: "string", enum: [...DIMENSIONS] },
            score: { type: "integer" },
          },
          required: ["dimension", "score"],
        },
      },
      risks: {
        type: "array",
        description: "3-5 concrete risks the board raised.",
        items: {
          type: "object",
          properties: {
            risk: { type: "string" },
            likelihood: { type: "string", enum: [...LEVELS] },
            impact: { type: "string", enum: [...LEVELS] },
          },
          required: ["risk", "likelihood", "impact"],
        },
      },
      financials: {
        type: "array",
        description:
          "Exactly four headline figures with short labels, e.g. 'Est. ARR', 'Implied burn', 'Runway', 'CAC : LTV'. Estimate from the pitch and say so with a ~ where it is inferred.",
        items: {
          type: "object",
          properties: { label: { type: "string" }, value: { type: "string" } },
          required: ["label", "value"],
        },
      },
      votes: {
        type: "array",
        description: "Exactly one entry per seated executive.",
        items: {
          type: "object",
          properties: {
            executiveId: {
              type: "string",
              enum: [...seatedExecutiveIds],
              description: "The executive's short id, not their name.",
            },
            vote: { type: "string", enum: [...VOTES] },
            rationale: {
              type: "string",
              description: "One sentence, in that executive's voice.",
            },
            confidence: {
              type: "integer",
              description:
                "0-100 conviction in their own vote. An executive who argued from limited information should be under 60.",
            },
            biggestRisk: {
              type: "string",
              description: "The single risk this executive weighted most heavily, in a short phrase.",
            },
            biggestStrength: {
              type: "string",
              description: "The single strongest thing this executive saw, in a short phrase.",
            },
            requiredMilestone: {
              type: "string",
              description:
                "The one concrete, measurable thing the company must show before this executive would invest.",
            },
            chequeSize: {
              type: "string",
              description:
                "Cheque this executive would write at this stage, with currency, e.g. '$250K' or 'None at this stage'.",
            },
            returnHorizon: {
              type: "string",
              description: "When they would expect a return, e.g. '5-7 years' or 'No credible path'.",
            },
          },
          required: [
            "executiveId",
            "vote",
            "rationale",
            "confidence",
            "biggestRisk",
            "biggestStrength",
            "requiredMilestone",
            "chequeSize",
            "returnHorizon",
          ],
        },
      },
    },
    required: [
      "investmentScore",
      "verdict",
      "executiveSummary",
      "swot",
      "dimensions",
      "risks",
      "financials",
      "votes",
    ],
  };
}

const ANALYSIS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    investmentReadiness: {
      type: "integer",
      description:
        "0-100: how ready this company is to take money right now. Distinct from quality — a strong company with no data room is not ready.",
    },
    confidence: {
      type: "object",
      description:
        "How certain the board is about its own judgement on each axis, 0-100. Low where the debate lacked evidence.",
      properties: {
        overall: { type: "integer" },
        market: { type: "integer" },
        technology: { type: "integer" },
        financial: { type: "integer" },
        founder: { type: "integer" },
      },
      required: ["overall", "market", "technology", "financial", "founder"],
    },
    consensus: {
      type: "array",
      description: "2-4 points the board actually agreed on. Name the executives who held each.",
      items: {
        type: "object",
        properties: {
          point: { type: "string" },
          executives: { type: "array", items: { type: "string" } },
        },
        required: ["point", "executives"],
      },
    },
    disagreements: {
      type: "array",
      description:
        "1-3 genuine splits from the transcript, each with both sides and who held them. Do not invent a disagreement that did not happen.",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          positionA: {
            type: "object",
            properties: {
              summary: { type: "string" },
              executives: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "executives"],
          },
          positionB: {
            type: "object",
            properties: {
              summary: { type: "string" },
              executives: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "executives"],
          },
        },
        required: ["topic", "positionA", "positionB"],
      },
    },
    mostConvincingArgument: {
      type: "object",
      description: "The single strongest point anyone made, and who made it.",
      properties: { executive: { type: "string" }, argument: { type: "string" } },
      required: ["executive", "argument"],
    },
    weakestFounderAnswer: {
      type: "object",
      description:
        "The question the founder handled worst, and why the answer was weak. If the founder never spoke, say so plainly.",
      properties: { question: { type: "string" }, whyWeak: { type: "string" } },
      required: ["question", "whyWeak"],
    },
    riskTimeline: {
      type: "array",
      description: "3-5 risks placed on the horizon at which they become dangerous.",
      items: {
        type: "object",
        properties: {
          horizon: { type: "string", enum: [...HORIZONS] },
          risk: { type: "string" },
        },
        required: ["horizon", "risk"],
      },
    },
    nextSteps: {
      type: "array",
      description: "3-5 specific actions the founder should take next, each one sentence.",
      items: { type: "string" },
    },
    roadmap: {
      type: "array",
      description: "3-5 improvement steps that would move the board's verdict, sequenced.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          priority: { type: "string", enum: [...PRIORITIES] },
        },
        required: ["title", "detail", "priority"],
      },
    },
  },
  required: [
    "investmentReadiness",
    "confidence",
    "consensus",
    "disagreements",
    "mostConvincingArgument",
    "weakestFounderAnswer",
    "riskTimeline",
    "nextSteps",
    "roadmap",
  ],
};

function clampScore(value: unknown, fallback: number) {
  const score = Math.round(Number(value));
  if (!Number.isFinite(score)) return fallback;
  return Math.min(100, Math.max(0, score));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const match = allowed.find((option) => option.toLowerCase() === String(value).trim().toLowerCase());
  return match ?? fallback;
}

/**
 * Coerces a field the model was asked to return as an array.
 *
 * `?? []` only covers null and undefined, so a wrong *type* still reached
 * `.find`/`.map` and threw — which killed the whole write-up. The types on
 * `RawVerdict` describe what was requested, not what arrives: `groq.ts` falls
 * back to plain JSON mode whenever a model rejects `json_schema`, and there
 * the schema is only a prompt.
 *
 * The shape that comes back instead is nearly always the same one — an object
 * keyed by the field each entry was supposed to carry, `{"Strengths": [...]}`
 * rather than `[{ title: "Strengths", items: [...] }]`. Passing `keyed`
 * rebuilds the entries from those keys so the content survives; every other
 * shape degrades to empty, which each caller below already handles.
 */
function asArray<T>(value: T[] | undefined, keyed?: { key: string; value: string }): T[] {
  if (Array.isArray(value)) return value;

  const raw: unknown = value;
  if (keyed && raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, entry]) =>
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? ({ [keyed.key]: key, ...entry } as T)
        : ({ [keyed.key]: key, [keyed.value]: entry } as T),
    );
  }

  return [];
}

/** Always returns all four sections, in a fixed order, so `SwotGrid` cannot miss a lookup. */
export function normaliseSwot(raw: RawVerdict["swot"]): SwotSection[] {
  const sections = asArray(raw, { key: "title", value: "items" });

  return SWOT_TITLES.map((title) => {
    const section = sections.find(
      (entry) => String(entry?.title).trim().toLowerCase() === title.toLowerCase(),
    );
    const items = asArray(section?.items)
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return {
      title,
      items: items.length ? items : ["The board did not record anything here."],
    };
  });
}

export function normaliseDimensions(raw: RawVerdict["dimensions"], fallback: number) {
  const entries = asArray(raw, { key: "dimension", value: "score" });

  return DIMENSIONS.map((dimension) => {
    const entry = entries.find(
      (candidate) => String(candidate?.dimension).trim().toLowerCase() === dimension.toLowerCase(),
    );
    return { dimension, score: clampScore(entry?.score, fallback) };
  });
}

export function normaliseRisks(raw: RawVerdict["risks"]): RiskRow[] {
  const risks = asArray(raw, { key: "risk", value: "impact" })
    .filter((entry) => String(entry?.risk ?? "").trim().length > 0)
    .slice(0, 6)
    .map((entry) => ({
      risk: String(entry.risk).trim(),
      likelihood: pickEnum(entry.likelihood, LEVELS, "Medium"),
      impact: pickEnum(entry.impact, LEVELS, "Medium"),
    }));

  return risks.length
    ? risks
    : [
        {
          risk: "Not enough detail in the pitch to assess risk.",
          likelihood: "Medium",
          impact: "Medium",
        },
      ];
}

export function normaliseFinancials(raw: RawVerdict["financials"]) {
  const seen = new Set<string>();
  const financials = asArray(raw, { key: "label", value: "value" })
    .map((entry) => ({
      label: String(entry?.label ?? "").trim(),
      value: String(entry?.value ?? "").trim(),
    }))
    .filter((entry) => {
      // MetricCard is keyed by label, so duplicates would collide.
      if (!entry.label || !entry.value || seen.has(entry.label)) return false;
      seen.add(entry.label);
      return true;
    })
    .slice(0, 4);

  return financials.length ? financials : [{ label: "Figures", value: "Not stated in pitch" }];
}

export function normaliseVotes(raw: RawVerdict["votes"], seatedExecutiveIds: string[]) {
  const knownIds = new Set(executivePersonas.map((persona) => persona.id));
  const seated = seatedExecutiveIds.filter((id) => knownIds.has(id));
  const cast = asArray(raw, { key: "executiveId", value: "vote" });

  return seated.map((executiveId) => {
    const persona = executivePersonas.find((candidate) => candidate.id === executiveId);
    // The schema constrains `executiveId` to an enum of seated ids, but the
    // model still tends toward names ("Marcus Webb") or roles ("CFO Agent").
    // Matching all three keeps a real vote from silently degrading to the
    // "conditional" fallback.
    const aliases = new Set(
      [executiveId, persona?.name, persona?.role]
        .filter((alias): alias is string => Boolean(alias))
        .map((alias) => alias.toLowerCase()),
    );

    const entry = cast.find((candidate) =>
      aliases.has(
        String(candidate?.executiveId ?? "")
          .trim()
          .toLowerCase(),
      ),
    );

    const vote = pickEnum(entry?.vote, VOTES, "conditional");

    return {
      executiveId,
      executiveName: persona?.name ?? executiveId,
      role: persona?.role ?? "Executive",
      vote,
      rationale: String(entry?.rationale ?? "").trim() || "No rationale recorded.",
      // A missing confidence defaults low rather than to 50. If the model
      // could not commit a number, the honest reading is that the board was
      // not confident — not that it was exactly on the fence.
      confidence: clampScore(entry?.confidence, 40),
      biggestRisk: text(entry?.biggestRisk, "Not recorded."),
      biggestStrength: text(entry?.biggestStrength, "Not recorded."),
      requiredMilestone: text(entry?.requiredMilestone, "Not specified."),
      chequeSize: text(entry?.chequeSize, vote === "no" ? "None at this stage" : "Not specified"),
      returnHorizon: text(entry?.returnHorizon, "Not specified"),
    };
  });
}

function text(value: unknown, fallback: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0)
    .slice(0, max);
}

/**
 * Shapes the second call's output.
 *
 * Every field degrades to something renderable rather than throwing. The
 * report detail page indexes into lookup tables by horizon and priority, so
 * an off-enum string would crash it — `pickEnum` is what keeps that safe,
 * exactly as it does for SWOT titles and risk levels.
 */
function normaliseAnalysis(raw: RawAnalysis, investmentScore: number) {
  const confidence: ConfidenceBreakdown = {
    overall: clampScore(raw.confidence?.overall, 50),
    market: clampScore(raw.confidence?.market, 50),
    technology: clampScore(raw.confidence?.technology, 50),
    financial: clampScore(raw.confidence?.financial, 50),
    founder: clampScore(raw.confidence?.founder, 50),
  };

  const consensus: ConsensusPoint[] = asArray(raw.consensus, { key: "point", value: "executives" })
    .map((entry) => ({
      point: text(entry?.point, ""),
      executives: stringList(entry?.executives, 8),
    }))
    .filter((entry) => entry.point.length > 0)
    .slice(0, 4);

  // No `keyed` mapping here: a disagreement is two nested positions, so there
  // is no single scalar field a bare object key could be rebuilt into.
  const disagreements: DisagreementPoint[] = asArray(raw.disagreements)
    .map((entry) => ({
      topic: text(entry?.topic, ""),
      positionA: {
        summary: text(entry?.positionA?.summary, ""),
        executives: stringList(entry?.positionA?.executives, 8),
      },
      positionB: {
        summary: text(entry?.positionB?.summary, ""),
        executives: stringList(entry?.positionB?.executives, 8),
      },
    }))
    // A "disagreement" with only one side described is not a disagreement,
    // and renders as a broken two-column row.
    .filter((entry) => entry.topic && entry.positionA.summary && entry.positionB.summary)
    .slice(0, 3);

  const riskTimeline: RiskTimelineEntry[] = asArray(raw.riskTimeline, {
    key: "horizon",
    value: "risk",
  })
    .map((entry) => ({
      horizon: pickEnum(entry?.horizon, HORIZONS, "6 months"),
      risk: text(entry?.risk, ""),
    }))
    .filter((entry) => entry.risk.length > 0)
    .slice(0, 6)
    // Chronological, so the UI can render it as a timeline without sorting.
    .sort((a, b) => HORIZONS.indexOf(a.horizon) - HORIZONS.indexOf(b.horizon));

  const roadmap: RoadmapStep[] = asArray(raw.roadmap, { key: "title", value: "detail" })
    .map((entry) => ({
      title: text(entry?.title, ""),
      detail: text(entry?.detail, ""),
      priority: pickEnum(entry?.priority, PRIORITIES, "Near-term"),
    }))
    .filter((entry) => entry.title.length > 0)
    .slice(0, 5)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  const convincing = raw.mostConvincingArgument;
  const weakest = raw.weakestFounderAnswer;

  return {
    investmentReadiness: clampScore(raw.investmentReadiness, investmentScore),
    confidence,
    consensus,
    disagreements,
    mostConvincingArgument:
      convincing && text(convincing.argument, "").length > 0
        ? { executive: text(convincing.executive, "The board"), argument: text(convincing.argument, "") }
        : undefined,
    weakestFounderAnswer:
      weakest && text(weakest.question, "").length > 0
        ? { question: text(weakest.question, ""), whyWeak: text(weakest.whyWeak, "Not explained.") }
        : undefined,
    riskTimeline,
    nextSteps: stringList(raw.nextSteps, 5),
    roadmap,
  };
}

/** Derives the verdict band from the score when the model's label disagrees with it. */
function verdictForScore(score: number) {
  if (score >= 75) return "Strong buy" as const;
  if (score >= 50) return "Conditional" as const;
  return "Pass" as const;
}

export interface VerdictInput {
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
  seatedExecutiveIds: string[];
  transcript: MeetingTranscriptMessage[];
  /** Sources the evidence seats actually retrieved during the session. */
  sources?: ReportSource[];
}

export async function generateVerdict(input: VerdictInput): Promise<GeneratedVerdict> {
  const roster = input.seatedExecutiveIds
    .map((id) => {
      try {
        const persona = getPersona(id);
        return `- ${persona.id}: ${persona.name}, ${persona.role}`;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n");

  const transcript = input.transcript
    .filter((message) => message.speakerId !== "system")
    .map((message) => `${message.speakerName} (${message.role}): ${message.message}`)
    .join("\n");

  const prompt = [
    `Startup: ${input.startupName}`,
    `One-liner: ${input.oneLiner}`,
    `Industry: ${input.industry}`,
    `Stage: ${input.stage}`,
    "",
    "The pitch:",
    input.pitch,
    "",
    "Seated executives:",
    roster,
    "",
    "Full session transcript:",
    transcript || "(the board did not get to debate this pitch)",
  ].join("\n");

  const raw = await generateJson<RawVerdict>({
    systemPrompt: [
      "You are the clerk of an AI investment board. The session has ended and you are writing up the outcome.",
      "Ground every judgement in what was actually said in the transcript and the pitch — never invent traction,",
      "revenue or customer numbers that were not stated. Where a figure has to be estimated, mark it with a ~.",
      "Each executive's vote must be consistent with the position they argued during the debate.",
      "Be honest rather than encouraging: a thin pitch should score poorly.",
    ].join(" "),
    turns: [{ role: "user", content: prompt }],
    responseSchema: buildVerdictSchema(input.seatedExecutiveIds),
    temperature: 0.4,
    maxOutputTokens: 4096,
  });

  const investmentScore = clampScore(raw.investmentScore, 50);
  const requestedVerdict = pickEnum(raw.verdict, VERDICTS, verdictForScore(investmentScore));

  // Second pass for the deeper analysis. Deliberately non-fatal: the verdict,
  // the votes and the SWOT are the report's contract, and a founder should
  // not lose all of that because a consensus map failed to parse.
  let analysis: ReturnType<typeof normaliseAnalysis> | null = null;
  try {
    const rawAnalysis = await generateJson<RawAnalysis>({
      systemPrompt: [
        "You are the clerk of an AI investment board, writing the analytical appendix to a completed session.",
        "Every claim must be traceable to something actually said in the transcript. Where the board never",
        "discussed something, say so rather than inventing a position for them. Name executives by their",
        "display name exactly as it appears in the transcript.",
        "Be specific: 'improve retention' is useless, 'get 90-day cohort retention above 40% before raising' is not.",
      ].join(" "),
      turns: [{ role: "user", content: prompt }],
      responseSchema: ANALYSIS_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 3072,
    });
    analysis = normaliseAnalysis(rawAnalysis, investmentScore);
  } catch {
    // Leave the richer sections undefined — the detail page treats them all
    // as optional precisely so this degradation is invisible rather than fatal.
  }

  return {
    votes: normaliseVotes(raw.votes, input.seatedExecutiveIds),
    report: {
      startupName: input.startupName,
      oneLiner: input.oneLiner,
      industry: input.industry,
      investmentScore,
      // Keep the badge and the number telling the same story.
      verdict:
        requestedVerdict === verdictForScore(investmentScore)
          ? requestedVerdict
          : verdictForScore(investmentScore),
      executiveSummary:
        String(raw.executiveSummary ?? "").trim() || "The board did not record an executive summary.",
      swot: normaliseSwot(raw.swot),
      dimensions: normaliseDimensions(raw.dimensions, investmentScore),
      risks: normaliseRisks(raw.risks),
      financials: normaliseFinancials(raw.financials),
      ...(analysis ?? {}),
      // Sources are retrieved, not generated — they bypass the model entirely
      // so a citation can never be hallucinated into the report.
      ...(input.sources?.length ? { sources: input.sources } : {}),
    },
  };
}
