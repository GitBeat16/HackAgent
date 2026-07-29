import type { AvatarPresence } from "@/components/ui/avatar";
import type { BoardVote, MessageVerification } from "@/types/api";

export interface SeatedExecutive {
  id: string;
  name: string;
  /** Display-only label, e.g. "CFO Agent" — never used as a lookup key. */
  role: string;
  presence: AvatarPresence;
  vote?: BoardVote;
}

export interface TranscriptMessage {
  id: string;
  speaker: string;
  /** Display-only label, e.g. "CFO Agent" or "Founder" — never used as a lookup key. */
  role: string;
  message: string;
  timestamp: string;
  /** True for the founder's own turns, which render right-aligned. */
  isFounder: boolean;
  /** Fact-check outcome, present only on turns that had evidence to check. */
  verification?: MessageVerification;
}

export interface PastSession {
  id: string;
  startupName: string;
  oneLiner: string;
  date: string;
  status: "completed" | "in-progress" | "scheduled";
  investmentScore?: number;
  /** Set once the session produced a report — report ids differ from meeting ids. */
  reportId?: string;
}

/** Where a live session is in its lifecycle, as the boardroom drives it. */
export type SessionPhase =
  /** Seated and ready, but no turn has been requested yet. */
  | "idle"
  | "debating"
  | "paused"
  /** Debate over; the board is writing up its verdict. */
  | "finalizing"
  | "complete";
