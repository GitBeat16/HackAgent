export interface WorkspaceResponse {
  profile: {
    displayName: string | null;
    email: string | null;
    title: string | null;
    workspaceName: string | null;
  };
  workspace: {
    kanban: unknown;
    financials: unknown;
    marketResearch: unknown;
    startupHealth: unknown;
    prdDocument: unknown;
    pitchDeck: unknown;
    notificationPrefs: Record<string, boolean>;
    plan: { name: string; price: string; seatsUsed: number; seatsTotal: number };
  };
}

export async function fetchWorkspace(): Promise<WorkspaceResponse> {
  const res = await fetch("/api/workspace", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load workspace (${res.status})`);
  return (await res.json()) as WorkspaceResponse;
}

export async function updateWorkspaceSettings(input: {
  profile?: WorkspaceResponse["profile"];
  notificationPrefs?: Record<string, boolean>;
}) {
  const res = await fetch("/api/workspace", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to save settings (${res.status})`);
}

export async function fetchBoardroomHistory() {
  const res = await fetch("/api/boardroom/history", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load boardroom history (${res.status})`);
  return (await res.json()) as { sessions: Array<{ id: string; startupName: string; oneLiner: string; date: string; status: string; investmentScore?: number }> };
}
