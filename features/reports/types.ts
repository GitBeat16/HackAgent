export interface ReportSummary {
  id: string;
  startupName: string;
  oneLiner: string;
  industry: string;
  investmentScore: number;
  verdict: "Strong buy" | "Conditional" | "Pass";
  generatedAt: string;
}

export interface SwotSection {
  title: "Strengths" | "Weaknesses" | "Opportunities" | "Threats";
  items: string[];
}

export interface RiskRow {
  risk: string;
  likelihood: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
}

export interface FinancialHighlight {
  label: string;
  value: string;
}

/**
 * The four axes the board's confidence is broken down along, plus the
 * overall roll-up. Separated from `dimensions` (which scores the *company*)
 * because this scores the *board's certainty about its own judgement* — a
 * high market score with low confidence is a very different signal from a
 * high market score the board is sure of.
 */
export interface ConfidenceBreakdown {
  overall: number;
  market: number;
  technology: number;
  financial: number;
  founder: number;
}

/** Where the board agreed, and where it split. */
export interface ConsensusPoint {
  point: string;
  /** Executive display names who held this position. */
  executives: string[];
}

export interface DisagreementPoint {
  topic: string;
  /** The two sides, each summarised in one line. */
  positionA: { summary: string; executives: string[] };
  positionB: { summary: string; executives: string[] };
}

export interface RiskTimelineEntry {
  horizon: "Now" | "6 months" | "12 months" | "24 months";
  risk: string;
}

export interface RoadmapStep {
  title: string;
  detail: string;
  /** Rough sequencing so the UI can render it as a path, not a pile. */
  priority: "Immediate" | "Near-term" | "Later";
}

/** A source the Research or VC agent actually retrieved during the session. */
export interface ReportSource {
  title: string;
  url: string;
}

export interface ReportDetail extends ReportSummary {
  executiveSummary: string;
  swot: SwotSection[];
  dimensions: { dimension: string; score: number }[];
  risks: RiskRow[];
  financials: FinancialHighlight[];

  // ---- Richer analysis. All optional so reports written before these
  // columns existed still render instead of crashing the detail page.
  /** 0–100. How ready this company is to take money, distinct from how good it is. */
  investmentReadiness?: number;
  confidence?: ConfidenceBreakdown;
  consensus?: ConsensusPoint[];
  disagreements?: DisagreementPoint[];
  mostConvincingArgument?: { executive: string; argument: string };
  weakestFounderAnswer?: { question: string; whyWeak: string };
  riskTimeline?: RiskTimelineEntry[];
  nextSteps?: string[];
  roadmap?: RoadmapStep[];
  sources?: ReportSource[];
  /**
   * How each executive actually voted, with their conditions.
   *
   * Optional because reports generated before the richer vote columns
   * existed have nothing to show here — the section hides rather than
   * rendering eight empty rows.
   */
  votes?: ExecutiveVoteDetail[];
}

/** One executive's full vote — the richer replacement for a bare yes/no. */
export interface ExecutiveVoteDetail {
  executiveId: string;
  executiveName: string;
  role: string;
  vote: "yes" | "no" | "conditional";
  rationale: string;
  /** 0–100 conviction in their own vote. */
  confidence: number;
  biggestRisk: string;
  biggestStrength: string;
  requiredMilestone: string;
  /** Free text, e.g. "$500K" or "~₹2Cr" — currency varies by market. */
  chequeSize: string;
  returnHorizon: string;
}
