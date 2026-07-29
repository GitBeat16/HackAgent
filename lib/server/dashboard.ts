import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/server/workspace";

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function monthLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(iso));
}

export async function getDashboardData(userId: string) {
  await ensureWorkspace(userId);
  const supabase = await createClient();

  const [{ data: meetings }, { data: reports }, { data: activity }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, startup_name, one_liner, status, created_at, reports(id, investment_score)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("reports").select("investment_score, generated_at").eq("user_id", userId).order("generated_at", { ascending: false }),
    supabase.from("activity_events").select("id, title, description, tone, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
  ]);

  const meetingRows = meetings ?? [];
  const reportRows = reports ?? [];
  const activeMeetings = meetingRows.filter((m) => m.status === "in-progress").length;
  const avgScore = reportRows.length
    ? Math.round(reportRows.reduce((sum, report) => sum + report.investment_score, 0) / reportRows.length)
    : 0;

  const thisMonth = new Date().getMonth();
  const pitchesThisMonth = meetingRows.filter((m) => new Date(m.created_at).getMonth() === thisMonth).length;

  const metrics = [
    { label: "Active meetings", value: String(activeMeetings), trend: { value: 12, direction: "up" as const, label: "vs last week" } },
    { label: "Reports generated", value: String(reportRows.length), trend: { value: 8, direction: "up" as const, label: "this month" } },
    { label: "Avg. investment score", value: reportRows.length ? String(avgScore) : "—", trend: { value: 3, direction: "down" as const, label: "vs last month" } },
    { label: "Pitches this month", value: String(pitchesThisMonth), trend: { value: 0, direction: "flat" as const, label: "vs last month" } },
  ];

  const recentMeetings = meetingRows.slice(0, 5).map((meeting) => {
    const report = Array.isArray(meeting.reports) ? meeting.reports[0] : meeting.reports;
    return {
      id: meeting.id,
      startupName: meeting.startup_name,
      oneLiner: meeting.one_liner,
      status: meeting.status as "in-progress" | "completed" | "scheduled",
      investmentScore: report?.investment_score,
      // Report ids differ from meeting ids, so the UI needs this to link
      // anywhere useful.
      reportId: report?.id,
      updatedAt: formatRelativeTime(meeting.created_at),
    };
  });

  const recentActivity = (activity ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    timestamp: formatRelativeTime(event.created_at),
    tone: event.tone as "brass" | "signal" | "success" | "warning",
  }));

  const scoreTrend = [...reportRows]
    .slice(0, 6)
    .reverse()
    .map((report) => ({ month: monthLabel(report.generated_at), score: report.investment_score }));

  return { metrics, recentMeetings, recentActivity, scoreTrend };
}

export async function listPastMeetings(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("id, startup_name, one_liner, status, created_at, reports(id, investment_score)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);

  return (data ?? []).map((meeting) => {
    const report = Array.isArray(meeting.reports) ? meeting.reports[0] : meeting.reports;
    return {
      id: meeting.id,
      startupName: meeting.startup_name,
      oneLiner: meeting.one_liner,
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(meeting.created_at)),
      status: meeting.status as "completed" | "in-progress" | "scheduled",
      investmentScore: report?.investment_score,
      reportId: report?.id,
    };
  });
}
