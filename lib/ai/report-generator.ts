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
  BoardVote,
  BoardVerdict
} from "@/types/report";
import type { MeetingTranscriptMessage } from "@/types/api";

export interface GeneratedVerdict {
  votes: ExecutiveVoteDetail[];
  report: Omit<ReportDetail, "id" | "generatedAt">;
}

const SWOT_TITLES = ["Strengths", "Weaknesses", "Opportunities", "Threats"] as const;
const LEVELS = ["Low", "Medium", "High"] as const;
const VERDICTS = ["Recommend Pilot", "Conditional Pilot", "Reject"] as const;
const VOTES = ["yes", "no", "conditional"] as const;
const DIMENSIONS = ["Public Value", "Feasibility", "Scalability", "Tech Readiness", "Compliance"] as const;

interface RawVerdict {
  feasibilityScore?: number;
  pilotReadiness?: number;
  verdict?: string;
  executiveSummary?: string;
  swot?: Array<{ title?: string; points?: string[] }>;
  dimensions?: Array<{ dimension?: string; score?: number }>;
  risks?: Array<{ risk?: string; level?: string; mitigation?: string }>;
  budget?: { proposedCost?: string; costBreakdown?: string; valueForMoney?: string; fundingRequired?: string };
  votes?: Array<{
    executiveId?: string;
    vote?: string;
    rationale?: string;
    confidence?: number;
    biggestRisk?: string;
    biggestStrength?: string;
    requiredMilestone?: string;
  }>;
  confidence?: { score?: number; reason?: string };
  consensus?: Array<{ point?: string; executiveNames?: string[] }>;
  disagreements?: Array<{ point?: string; parties?: string[]; divide?: string }>;
  mostConvincingArgument?: string;
  weakestFounderAnswer?: string;
}

export async function generateVerdict(input: {
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
  seatedExecutiveIds: string[];
  transcript: MeetingTranscriptMessage[];
  sources: ReportSource[];
}): Promise<GeneratedVerdict> {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      feasibilityScore: { type: "number" },
      pilotReadiness: { type: "number" },
      verdict: { type: "string", enum: ["Recommend Pilot", "Conditional Pilot", "Reject"] },
      executiveSummary: { type: "string" },
      swot: { type: "array", items: { type: "object", properties: { title: { type: "string" }, points: { type: "array", items: { type: "string" } } } } },
      dimensions: { type: "array", items: { type: "object", properties: { dimension: { type: "string" }, score: { type: "number" } } } },
      risks: { type: "array", items: { type: "object", properties: { risk: { type: "string" }, level: { type: "string", enum: ["Low", "Medium", "High"] }, mitigation: { type: "string" } } } },
      budget: { type: "object", properties: { proposedCost: { type: "string" }, costBreakdown: { type: "string" }, valueForMoney: { type: "string" }, fundingRequired: { type: "string" } } },
      votes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            executiveId: { type: "string" },
            vote: { type: "string", enum: ["yes", "no", "conditional"] },
            rationale: { type: "string" },
            confidence: { type: "number" },
            biggestRisk: { type: "string" },
            biggestStrength: { type: "string" },
            requiredMilestone: { type: "string" }
          }
        }
      },
      confidence: { type: "object", properties: { score: { type: "number" }, reason: { type: "string" } } },
      consensus: { type: "array", items: { type: "object", properties: { point: { type: "string" }, executiveNames: { type: "array", items: { type: "string" } } } } },
      disagreements: { type: "array", items: { type: "object", properties: { point: { type: "string" }, parties: { type: "array", items: { type: "string" } }, divide: { type: "string" } } } },
      mostConvincingArgument: { type: "string" },
      weakestFounderAnswer: { type: "string" }
    }
  };

  const systemPrompt = `You are producing a final procurement evaluation for ${input.startupName}. 
Review the debate transcript and generate a structured JSON report. Ensure votes match exactly the executives seated: ${input.seatedExecutiveIds.join(", ")}.`;

  const conversation = input.transcript.map((m) => ({
    role: (m.speakerId === "founder" ? "user" : "assistant") as "user" | "assistant",
    content: m.speakerId === "founder" ? m.message : `${m.speakerName} (${m.role}): ${m.message}`,
  }));

  const result = await generateJson<RawVerdict>({
    systemPrompt,
    turns: [{ role: "user", content: input.pitch }, ...conversation],
    responseSchema: schema,
    maxOutputTokens: 2000,
  });

  const clamp = (val: unknown, min = 0, max = 100) => typeof val === "number" ? Math.max(min, Math.min(max, val)) : 50;

  const votes: ExecutiveVoteDetail[] = input.seatedExecutiveIds.map(id => {
    const rawVote = result.votes?.find(v => v.executiveId === id) || {};
    const persona = getPersona(id);
    return {
      executiveId: id,
      executiveName: persona.name,
      role: persona.role,
      vote: ((VOTES as readonly string[]).includes(rawVote.vote || "") ? rawVote.vote : "conditional") as BoardVote,
      rationale: rawVote.rationale || "Insufficient data.",
      confidence: clamp(rawVote.confidence),
      biggestRisk: rawVote.biggestRisk || "Unknown",
      biggestStrength: rawVote.biggestStrength || "Unknown",
      requiredMilestone: rawVote.requiredMilestone || "N/A"
    };
  });

  const dimensionsObj: Record<string, number> = {};
  DIMENSIONS.forEach(dim => {
    const found = result.dimensions?.find(d => d.dimension === dim);
    dimensionsObj[dim] = found ? clamp(found.score) : 50;
  });

  return {
    votes,
    report: {
      meetingId: "mapped-by-caller",
      startupName: input.startupName,
      oneLiner: input.oneLiner,
      industry: input.industry,
      feasibilityScore: clamp(result.feasibilityScore),
      pilotReadiness: clamp(result.pilotReadiness),
      verdict: ((VERDICTS as readonly string[]).includes(result.verdict || "") ? result.verdict : "Conditional Pilot") as BoardVerdict,
      executiveSummary: result.executiveSummary || "Summary unavailable.",
      swot: SWOT_TITLES.map(title => {
        const found = result.swot?.find(s => s.title === title);
        return { title, points: found?.points && Array.isArray(found.points) ? found.points : ["None identified."] };
      }),
      dimensions: dimensionsObj,
      radarDimensions: dimensionsObj,
      risks: (result.risks || []).map(r => ({
        risk: r.risk || "Unspecified risk",
        level: ((LEVELS as readonly string[]).includes(r.level || "") ? r.level : "Medium") as "Low" | "Medium" | "High",
        mitigation: r.mitigation || "None specified"
      })),
      budget: {
        proposedCost: result.budget?.proposedCost || "TBD",
        costBreakdown: result.budget?.costBreakdown || "TBD",
        valueForMoney: result.budget?.valueForMoney || "TBD",
        fundingRequired: result.budget?.fundingRequired || "TBD"
      },
      confidence: {
        score: clamp(result.confidence?.score),
        reason: result.confidence?.reason || "Consensus not fully mapped."
      },
      consensus: (result.consensus || []).map(c => ({
        point: c.point || "General agreement",
        executiveNames: Array.isArray(c.executiveNames) ? c.executiveNames : []
      })),
      disagreements: (result.disagreements || []).map(d => ({
        point: d.point || "Disagreement",
        parties: Array.isArray(d.parties) ? d.parties : [],
        divide: d.divide || "Unknown"
      })),
      mostConvincingArgument: result.mostConvincingArgument,
      weakestFounderAnswer: result.weakestFounderAnswer,
      executiveVotes: votes,
      sources: input.sources
    }
  };
}
