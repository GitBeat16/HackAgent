import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/server/workspace";

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export async function listHistory(userId: string) {
  await ensureWorkspace(userId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, title, description, tone, change_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  return (data ?? []).map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    timestamp: formatTimestamp(entry.created_at),
    tone: entry.tone as "brass" | "signal" | "success" | "warning",
    changeType: entry.change_type as "Report" | "Pitch deck" | "PRD" | "Financials",
  }));
}
