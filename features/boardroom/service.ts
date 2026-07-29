import type {
  AdvanceDebateResponse,
  ApiError,
  FinalizeMeetingResponse,
  MeetingResponse,
} from "@/types/api";
import type { PastSession } from "@/features/boardroom/types";

/** Surfaces the server's own message instead of a bare status code. */
async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as ApiError | null;
  return new Error(body?.error ?? `${fallback} (${res.status})`);
}

export async function fetchMeeting(id: string): Promise<MeetingResponse | null> {
  const res = await fetch(`/api/meetings/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw await readError(res, "Failed to load the session");
  return (await res.json()) as MeetingResponse;
}

/** The session to show when `/boardroom` is opened without a `?meeting=` id. */
export async function fetchLatestMeeting(): Promise<MeetingResponse | null> {
  const res = await fetch("/api/meetings/latest", { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Failed to load the latest session");
  const data = (await res.json()) as { meeting: MeetingResponse | null };
  return data.meeting;
}

/** Advances the debate by one executive turn, optionally with a founder reply first. */
export async function advanceDebate(id: string, founderMessage?: string): Promise<AdvanceDebateResponse> {
  const res = await fetch(`/api/meetings/${encodeURIComponent(id)}/debate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(founderMessage ? { founderMessage } : {}),
  });
  if (!res.ok) throw await readError(res, "The board could not respond");
  return (await res.json()) as AdvanceDebateResponse;
}

/** Ends the session: collects votes, writes the report, refreshes deliverables. */
export async function finalizeMeeting(id: string): Promise<FinalizeMeetingResponse> {
  const res = await fetch(`/api/meetings/${encodeURIComponent(id)}/finalize`, { method: "POST" });
  if (!res.ok) throw await readError(res, "Could not generate the board's report");
  return (await res.json()) as FinalizeMeetingResponse;
}

export async function fetchPastSessions(): Promise<PastSession[]> {
  const res = await fetch("/api/boardroom/history", { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Failed to load pitch history");
  const data = (await res.json()) as { sessions: PastSession[] };
  return data.sessions;
}
