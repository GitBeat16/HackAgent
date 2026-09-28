export type BoardVerdict = "Recommend Pilot" | "Conditional Pilot" | "Reject";
export type BoardVote = "yes" | "no" | "conditional";

export interface ExecutiveVoteDetail {
  executiveId: string;
  executiveName: string;
  role: string;
  vote: BoardVote;
  rationale: string;
  confidence: number;
  biggestRisk: string;
  biggestStrength: string;
  requiredMilestone: string;
}

export interface SwotSection {
  title: "Strengths" | "Weaknesses" | "Opportunities" | "Threats";
  points: string[];
}

export interface RiskRow {
  risk: string;
  level: "Low" | "Medium" | "High";
  mitigation: string;
}

export interface ConsensusPoint {
  point: string;
  executiveNames: string[];
}

export interface DisagreementPoint {
  point: string;
  parties: string[];
  divide: string;
}

export interface ConfidenceBreakdown {
  score: number;
  reason: string;
}

export interface ReportSource {
  title: string;
  url: string;
}

export interface RiskTimelineEntry {
  horizon: "Now" | "6 months" | "12 months" | "24 months";
  risk: string;
  mitigation: string;
}

export interface RoadmapStep {
  step: string;
  milestone: string;
}

export interface ReportDetail {
  id: string;
  meetingId: string;
  startupName: string;
  oneLiner: string;
  industry: string;
  feasibilityScore: number;
  pilotReadiness: number;
  verdict: BoardVerdict;
  executiveSummary: string;
  swot: SwotSection[];
  dimensions: Record<string, number>;
  risks: RiskRow[];
  budget: {
    proposedCost: string;
    costBreakdown: string;
    valueForMoney: string;
    fundingRequired: string;
  };
  executiveVotes?: ExecutiveVoteDetail[];
  radarDimensions?: Record<string, number>;
  generatedAt: string;
  confidence?: ConfidenceBreakdown;
  consensus?: ConsensusPoint[];
  disagreements?: DisagreementPoint[];
  mostConvincingArgument?: string;
  weakestFounderAnswer?: string;
  riskTimeline?: RiskTimelineEntry[];
  nextSteps?: string[];
  roadmap?: RoadmapStep[];
  sources?: ReportSource[];
}
