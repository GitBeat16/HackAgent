export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ---- Challenges ----
export interface CreateChallengeRequest {
  title: string;
  description: string;
  domain: string;
  budgetInr?: string;
  deadline?: string;
  datasetFile?: File; // For FormData
}
export interface CreateChallengeResponse {
  success: boolean;
  id: string;
}

// ---- Proposals ----
export interface SubmitProposalRequest {
  proposalText: string;
}
export interface SubmitProposalResponse {
  success: boolean;
  id: string;
}

export interface PilotKPI {
  name: string;
  baseline: string;
  target: string;
  unit: string;
}

export interface MilestoneInput {
  title: string;
  description: string;
  payment_inr: number;
  due_date: string;
}

export interface ApproveProposalRequest {
  duration_weeks: number;
  scope_description: string;
  data_constraints: string;
  kpis: PilotKPI[];
  milestones: MilestoneInput[];
  overrideReason?: string;
}

export interface RejectProposalRequest {
  reason: string;
}

export interface ProposalPipelineResponse {
  id: string;
  startup_id: string;
  status: string;
  ai_match_score: number | null;
  submitted_at: string;
  profiles: {
    startup_name: string;
  };
  milestones?: { title: string; description: string; paymentInr: number; dueDate?: string }[];
}

export interface MilestoneEvidenceRequest {
  file: File;
  documentTitle: string;
}

export interface AuditLogResponse {
  id: string;
  actor_id: string;
  actor_role: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  profiles?: {
    startup_name?: string;
    department_name?: string;
    role: string;
  };
}

// ---- Legacy BoardroomAI (Engine internals) ----
export interface CreatePitchRequest {
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
  executiveIds: string[];
}
export interface CreatePitchResponse {
  meetingId: string;
  status: "queued" | "in-progress";
}
export type MeetingStatus = "scheduled" | "in-progress" | "completed";
export interface MessageVerification {
  supported: string[];
  unsupported: string[];
  checked: boolean;
}
export interface MeetingTranscriptMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  role: string;
  message: string;
  createdAt: string;
  verification?: MessageVerification;
}
export type BoardVote = "yes" | "no" | "conditional";
export interface MeetingResponse {
  id: string;
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  status: MeetingStatus;
  executiveIds: string[];
  transcript: MeetingTranscriptMessage[];
  votes?: Record<string, BoardVote>;
  reportId?: string;
}
export interface AdvanceDebateRequest {
  founderMessage?: string;
}
export interface SpeakerSelectionInfo {
  phase: "opening" | "cross_examination" | "closing";
  topic: string;
  topicConfidence: number;
  ranking: Array<{
    executiveId: string;
    score: number;
    relevance: number;
    fairness: number;
    founderMention: number;
    disagreement: number;
  }>;
}
export interface AdvanceDebateResponse {
  founderMessage?: MeetingTranscriptMessage;
  message: MeetingTranscriptMessage | null;
  isComplete: boolean;
  selection?: SpeakerSelectionInfo;
  founderQuestion?: string;
}
export interface FinalizeMeetingResponse {
  reportId: string;
  feasibilityScore: number;
  verdict: "Recommend Pilot" | "Conditional Pilot" | "Reject";
  votes: Record<string, BoardVote>;
}
export interface ReportListResponse {
  reports: Array<{
    id: string;
    startupName: string;
    oneLiner: string;
    industry: string;
    feasibilityScore: number;
    verdict: "Recommend Pilot" | "Conditional Pilot" | "Reject";
    generatedAt: string;
  }>;
}
export interface ExecutiveListResponse {
  executives: Array<{
    id: string;
    name: string;
    role: string;
    trait: string;
    bio: string;
    focusAreas: string[];
  }>;
}
export interface HistoryListResponse {
  entries: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    changeType: "Report" | "Pitch deck" | "PRD" | "Financials";
  }>;
}
