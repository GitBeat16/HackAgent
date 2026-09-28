export interface WorkspaceResponse {
  profile: {
    displayName: string | null;
    email: string | null;
    title: string | null;
    role: string | null;
  };
}

export async function fetchWorkspace(): Promise<WorkspaceResponse> {
  const res = await fetch("/api/workspace", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load workspace (${res.status})`);
  return (await res.json()) as WorkspaceResponse;
}

export async function updateWorkspaceSettings(input: {
  profile?: WorkspaceResponse["profile"];
}) {
  const res = await fetch("/api/workspace", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Could not save settings.");
}
