import { createClient } from "@/lib/supabase/server";
import {
  defaultActivityEvents,
  defaultFinancials,
  defaultHistoryEvents,
  defaultKanban,
  defaultMarketResearch,
  defaultNotificationPrefs,
  defaultPitchDeck,
  defaultPrdDocument,
  defaultStartupHealth,
} from "@/lib/server/workspace-defaults";

type WorkspaceRow = {
  user_id: string;
  kanban: unknown;
  financials: unknown;
  market_research: unknown;
  startup_health: unknown;
  prd_document: unknown;
  pitch_deck: unknown;
  notification_prefs: unknown;
  plan_name: string;
  plan_price: string;
  seats_used: number;
  seats_total: number;
};

export async function ensureWorkspace(userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("workspace_data").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) return;

  await supabase.from("workspace_data").insert({
    user_id: userId,
    kanban: defaultKanban,
    financials: defaultFinancials,
    market_research: defaultMarketResearch,
    startup_health: defaultStartupHealth,
    prd_document: defaultPrdDocument,
    pitch_deck: defaultPitchDeck,
    notification_prefs: defaultNotificationPrefs,
  });

  const { count } = await supabase.from("activity_events").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (!count) {
    const now = Date.now();
    await supabase.from("activity_events").insert(
      [...defaultActivityEvents, ...defaultHistoryEvents].map((event, index) => ({
        user_id: userId,
        title: event.title,
        description: event.description,
        tone: event.tone,
        change_type: event.change_type,
        created_at: new Date(now - index * 3600_000).toISOString(),
      })),
    );
  }
}

export async function getWorkspace(userId: string) {
  await ensureWorkspace(userId);
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_data").select("*").eq("user_id", userId).single();
  if (error || !data) throw new Error(error?.message ?? "Could not load workspace.");
  return data as WorkspaceRow;
}

export async function updateWorkspaceField(userId: string, field: keyof WorkspaceRow, value: unknown) {
  // An UPDATE against a missing row succeeds while changing nothing, which
  // would silently drop generated deliverables for a brand-new workspace.
  await ensureWorkspace(userId);
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_data").update({ [field]: value, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error(error?.message ?? "Could not load profile.");
  return data;
}

export async function updateProfile(
  userId: string,
  input: { displayName?: string; email?: string; title?: string; workspaceName?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      email: input.email,
      title: input.title,
      workspace_name: input.workspaceName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
