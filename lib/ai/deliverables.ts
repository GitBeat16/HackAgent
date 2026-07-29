/**
 * Generates the "studio" and "intelligence" artefacts the board produces
 * alongside its report: market research, a financial model, a health
 * snapshot, a PRD and a pitch deck.
 *
 * These are workspace-scoped rather than report-scoped — they describe the
 * founder's current company, so a new session overwrites them. They are
 * stored as JSON in `workspace_data` and read back by `/api/workspace`.
 *
 * Every payload here must match the shape the corresponding page renders;
 * the `normalise*` helpers below are what guarantee that, since these
 * screens index into lookup tables by severity and strength.
 */

import { generateJson, type JsonSchema } from "@/lib/ai/groq";
import type { MeetingTranscriptMessage } from "@/types/api";

const STRENGTHS = ["Low", "Medium", "High"] as const;
const SEVERITIES = ["info", "warning", "critical"] as const;
const DIRECTIONS = ["up", "down", "flat"] as const;
const HEALTH_DIMENSIONS = ["Team", "Product", "Market", "Financials", "Traction"] as const;

const PRD_SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "problem", title: "Problem statement" },
  { id: "goals", title: "Goals" },
  { id: "requirements", title: "Requirements" },
  { id: "non-goals", title: "Non-goals" },
  { id: "success-metrics", title: "Success metrics" },
] as const;

const DECK_SLIDES = [
  "Title",
  "The problem",
  "The solution",
  "Market size",
  "Traction",
  "Business model",
  "Team",
  "The ask",
] as const;

/** Mirrors the payloads `/api/workspace` hands to each page. */
export interface GeneratedDeliverables {
  marketResearch: {
    marketSizing: Array<{ name: string; value: number }>;
    competitors: Array<{
      name: string;
      segment: string;
      funding: string;
      strength: (typeof STRENGTHS)[number];
    }>;
    marketTrend: Array<{ year: string; marketSize: number }>;
  };
  financials: {
    metrics: Array<{
      label: string;
      value: string;
      trend: {
        value: number;
        direction: (typeof DIRECTIONS)[number];
        label: string;
      };
    }>;
    revenueExpense: Array<{ month: string; revenue: number; expense: number }>;
    capTable: Array<{ holder: string; role: string; ownership: number }>;
  };
  startupHealth: {
    healthScore: number;
    healthDimensions: Array<{ dimension: string; score: number }>;
    healthFlags: Array<{
      id: string;
      title: string;
      description: string;
      severity: (typeof SEVERITIES)[number];
    }>;
  };
  prdDocument: Array<{ id: string; title: string; content: string }>;
  pitchDeck: Array<{
    id: string;
    index: number;
    title: string;
    bullets: string[];
  }>;
}

interface RawDeliverables {
  marketResearch?: {
    marketSizing?: Array<{ name?: string; value?: number }>;
    competitors?: Array<{
      name?: string;
      segment?: string;
      funding?: string;
      strength?: string;
    }>;
    marketTrend?: Array<{ year?: string; marketSize?: number }>;
  };
  financials?: {
    metrics?: Array<{
      label?: string;
      value?: string;
      trendValue?: number;
      trendDirection?: string;
      trendLabel?: string;
    }>;
    revenueExpense?: Array<{
      month?: string;
      revenue?: number;
      expense?: number;
    }>;
    capTable?: Array<{ holder?: string; role?: string; ownership?: number }>;
  };
  startupHealth?: {
    healthScore?: number;
    healthDimensions?: Array<{ dimension?: string; score?: number }>;
    healthFlags?: Array<{
      title?: string;
      description?: string;
      severity?: string;
    }>;
  };
  prdDocument?: Array<{ title?: string; content?: string }>;
  pitchDeck?: Array<{ title?: string; bullets?: string[] }>;
}

const schema: JsonSchema = {
  type: "object",
  properties: {
    marketResearch: {
      type: "object",
      properties: {
        marketSizing: {
          type: "array",
          description:
            "Exactly three entries in this order: SOM, SAM, TAM. `name` must read like 'SOM — Serviceable obtainable'. `value` is in millions of USD.",
          items: {
            type: "object",
            properties: { name: { type: "string" }, value: { type: "number" } },
            required: ["name", "value"],
          },
        },
        competitors: {
          type: "array",
          description: "3-5 real or realistic competitors in this specific market.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              segment: { type: "string" },
              funding: {
                type: "string",
                description: "e.g. '$18M raised' or 'Bootstrapped'.",
              },
              strength: { type: "string", enum: [...STRENGTHS] },
            },
            required: ["name", "segment", "funding", "strength"],
          },
        },
        marketTrend: {
          type: "array",
          description: "Five consecutive years ending in the current year, TAM in millions of USD.",
          items: {
            type: "object",
            properties: {
              year: { type: "string" },
              marketSize: { type: "number" },
            },
            required: ["year", "marketSize"],
          },
        },
      },
      required: ["marketSizing", "competitors", "marketTrend"],
    },
    financials: {
      type: "object",
      properties: {
        metrics: {
          type: "array",
          description: "Exactly four headline metrics, e.g. MRR, burn rate, runway, CAC : LTV.",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              trendValue: {
                type: "number",
                description: "Percentage change, unsigned.",
              },
              trendDirection: { type: "string", enum: [...DIRECTIONS] },
              trendLabel: {
                type: "string",
                description: "e.g. 'vs last month'.",
              },
            },
            required: ["label", "value", "trendValue", "trendDirection", "trendLabel"],
          },
        },
        revenueExpense: {
          type: "array",
          description: "Six consecutive months, most recent last. Figures in thousands of USD.",
          items: {
            type: "object",
            properties: {
              month: {
                type: "string",
                description: "Three-letter month, e.g. 'Jul'.",
              },
              revenue: { type: "number" },
              expense: { type: "number" },
            },
            required: ["month", "revenue", "expense"],
          },
        },
        capTable: {
          type: "array",
          description: "3-5 holders whose ownership percentages sum to 100.",
          items: {
            type: "object",
            properties: {
              holder: { type: "string" },
              role: {
                type: "string",
                description: "e.g. 'Common' or 'Preferred'.",
              },
              ownership: { type: "number" },
            },
            required: ["holder", "role", "ownership"],
          },
        },
      },
      required: ["metrics", "revenueExpense", "capTable"],
    },
    startupHealth: {
      type: "object",
      properties: {
        healthScore: { type: "integer", description: "0-100 overall health." },
        healthDimensions: {
          type: "array",
          description: "Exactly five entries, one per named dimension.",
          items: {
            type: "object",
            properties: {
              dimension: { type: "string", enum: [...HEALTH_DIMENSIONS] },
              score: { type: "integer" },
            },
            required: ["dimension", "score"],
          },
        },
        healthFlags: {
          type: "array",
          description: "2-4 flags the board would watch.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: {
                type: "string",
                description: "One or two sentences.",
              },
              severity: { type: "string", enum: [...SEVERITIES] },
            },
            required: ["title", "description", "severity"],
          },
        },
      },
      required: ["healthScore", "healthDimensions", "healthFlags"],
    },
    prdDocument: {
      type: "array",
      description:
        "Exactly six sections in this order: Overview, Problem statement, Goals, Requirements, Non-goals, Success metrics. Spec the single highest-leverage fix the board identified, not the whole product.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "2-3 sentences." },
        },
        required: ["title", "content"],
      },
    },
    pitchDeck: {
      type: "array",
      description:
        "Exactly eight slides in this order: Title, The problem, The solution, Market size, Traction, Business model, Team, The ask. The first slide's title is the startup's name.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          bullets: {
            type: "array",
            description: "Two or three short bullets.",
            items: { type: "string" },
          },
        },
        required: ["title", "bullets"],
      },
    },
  },
  required: ["marketResearch", "financials", "startupHealth", "prdDocument", "pitchDeck"],
};

function num(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: unknown, fallback: number) {
  return Math.min(100, Math.max(0, Math.round(num(value, fallback))));
}

function text(value: unknown, fallback: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : fallback;
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((option) => option.toLowerCase() === String(value).trim().toLowerCase()) ?? fallback;
}

export interface DeliverablesInput {
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
  investmentScore: number;
  transcript: MeetingTranscriptMessage[];
}

function normalise(raw: RawDeliverables, input: DeliverablesInput): GeneratedDeliverables {
  const currentYear = new Date().getFullYear();

  const marketSizing = (raw.marketResearch?.marketSizing ?? [])
    .map((slice) => ({
      name: text(slice?.name, "Market"),
      value: Math.max(0, num(slice?.value, 0)),
    }))
    .filter((slice) => slice.value > 0)
    .slice(0, 3);

  const marketTrend = (raw.marketResearch?.marketTrend ?? [])
    .map((point, index) => ({
      year: text(point?.year, String(currentYear - 4 + index)),
      marketSize: Math.max(0, num(point?.marketSize, 0)),
    }))
    .slice(0, 6);

  const capTable = (raw.financials?.capTable ?? [])
    .map((row) => ({
      holder: text(row?.holder, "Unallocated"),
      role: text(row?.role, "Common"),
      ownership: Math.max(0, num(row?.ownership, 0)),
    }))
    .filter((row) => row.ownership > 0)
    .slice(0, 6);

  return {
    marketResearch: {
      marketSizing: marketSizing.length
        ? marketSizing
        : [
            { name: "SOM — Serviceable obtainable", value: 1 },
            { name: "SAM — Serviceable addressable", value: 10 },
            { name: "TAM — Total addressable", value: 100 },
          ],
      competitors: (raw.marketResearch?.competitors ?? [])
        .map((competitor) => ({
          name: text(competitor?.name, "Unnamed competitor"),
          segment: text(competitor?.segment, "—"),
          funding: text(competitor?.funding, "Undisclosed"),
          strength: pickEnum(competitor?.strength, STRENGTHS, "Medium"),
        }))
        .slice(0, 6),
      marketTrend: marketTrend.length
        ? marketTrend
        : Array.from({ length: 5 }, (_, index) => ({
            year: String(currentYear - 4 + index),
            marketSize: 100,
          })),
    },
    financials: {
      metrics: (raw.financials?.metrics ?? [])
        .map((metric) => ({
          label: text(metric?.label, "Metric"),
          value: text(metric?.value, "—"),
          trend: {
            value: Math.abs(Math.round(num(metric?.trendValue, 0))),
            direction: pickEnum(metric?.trendDirection, DIRECTIONS, "flat"),
            label: text(metric?.trendLabel, "vs last month"),
          },
        }))
        // MetricCard is keyed by label, so duplicates would collide.
        .filter((metric, index, all) => all.findIndex((other) => other.label === metric.label) === index)
        .slice(0, 4),
      revenueExpense: (raw.financials?.revenueExpense ?? [])
        .map((point) => ({
          month: text(point?.month, "—"),
          revenue: Math.max(0, num(point?.revenue, 0)),
          expense: Math.max(0, num(point?.expense, 0)),
        }))
        .slice(0, 12),
      capTable: capTable.length ? capTable : [{ holder: "Founders", role: "Common", ownership: 100 }],
    },
    startupHealth: {
      healthScore: clamp(raw.startupHealth?.healthScore, input.investmentScore),
      healthDimensions: HEALTH_DIMENSIONS.map((dimension) => {
        const entry = (raw.startupHealth?.healthDimensions ?? []).find(
          (candidate) => String(candidate?.dimension).trim().toLowerCase() === dimension.toLowerCase(),
        );
        return { dimension, score: clamp(entry?.score, input.investmentScore) };
      }),
      healthFlags: (raw.startupHealth?.healthFlags ?? [])
        .filter((flag) => String(flag?.title ?? "").trim().length > 0)
        .slice(0, 5)
        .map((flag, index) => ({
          id: `flag_${index + 1}`,
          title: text(flag?.title, "Watch item"),
          description: text(flag?.description, "No detail recorded."),
          severity: pickEnum(flag?.severity, SEVERITIES, "info"),
        })),
    },
    // Fixed ids and titles: the PRD outline is navigation, so it must not
    // drift between generations.
    prdDocument: PRD_SECTIONS.map((section, index) => {
      const entry = (raw.prdDocument ?? []).find(
        (candidate) => String(candidate?.title).trim().toLowerCase() === section.title.toLowerCase(),
      );
      return {
        id: section.id,
        title: section.title,
        content: text(entry?.content ?? raw.prdDocument?.[index]?.content, "Not specified by the board."),
      };
    }),
    pitchDeck: DECK_SLIDES.map((slideName, index) => {
      const entry = (raw.pitchDeck ?? [])[index];
      const fallbackTitle = index === 0 ? input.startupName : slideName;
      const bullets = (entry?.bullets ?? [])
        .map((bullet) => String(bullet).trim())
        .filter((bullet) => bullet.length > 0);
      return {
        id: `s${index + 1}`,
        index: index + 1,
        title: text(entry?.title, fallbackTitle),
        bullets: bullets.length ? bullets.slice(0, 4) : ["Not covered in the pitch."],
      };
    }),
  };
}

export async function generateDeliverables(input: DeliverablesInput): Promise<GeneratedDeliverables> {
  const transcript = input.transcript
    .filter((message) => message.speakerId !== "system")
    .map((message) => `${message.speakerName} (${message.role}): ${message.message}`)
    .join("\n");

  const prompt = [
    `Startup: ${input.startupName}`,
    `One-liner: ${input.oneLiner}`,
    `Industry: ${input.industry}`,
    `Stage: ${input.stage}`,
    `Board's investment score: ${input.investmentScore}/100`,
    "",
    "The pitch:",
    input.pitch,
    "",
    "Session transcript:",
    transcript || "(no debate took place)",
  ].join("\n");

  const raw = await generateJson<RawDeliverables>({
    systemPrompt: [
      "You are an analyst preparing the deliverables an AI investment board hands a founder after a session.",
      "Everything must be specific to this company, market and stage — never reuse generic filler.",
      "Where the pitch states a real number, use it. Where you must estimate, keep the estimate plausible for",
      "the stated stage rather than flattering, and prefix inferred currency figures with ~.",
      "The PRD must spec the single highest-leverage fix the board identified, not the entire product.",
    ].join(" "),
    turns: [{ role: "user", content: prompt }],
    responseSchema: schema,
    temperature: 0.6,
    // The normalised payload caps every collection (6 competitors, 4 metrics,
    // 12 revenue points, 6 slides...), so a full response lands well under
    // this. 8192 only reserved output budget nothing could use.
    maxOutputTokens: 5120,
  });

  return normalise(raw, input);
}
