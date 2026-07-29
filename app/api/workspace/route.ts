import { NextResponse } from "next/server";
import { getProfile, getWorkspace, updateProfile, updateWorkspaceField } from "@/lib/server/workspace";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const [workspace, profile] = await Promise.all([getWorkspace(user.id), getProfile(user.id)]);

  return NextResponse.json({
    profile: {
      displayName: profile.display_name,
      email: profile.email ?? user.email,
      title: profile.title,
      workspaceName: profile.workspace_name,
    },
    workspace: {
      kanban: workspace.kanban,
      financials: workspace.financials,
      marketResearch: workspace.market_research,
      startupHealth: workspace.startup_health,
      prdDocument: workspace.prd_document,
      pitchDeck: workspace.pitch_deck,
      notificationPrefs: workspace.notification_prefs,
      plan: {
        name: workspace.plan_name,
        price: workspace.plan_price,
        seatsUsed: workspace.seats_used,
        seatsTotal: workspace.seats_total,
      },
    },
  });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as {
    profile?: { displayName?: string; email?: string; title?: string; workspaceName?: string };
    notificationPrefs?: Record<string, boolean>;
  };

  if (body.profile) await updateProfile(user.id, body.profile);
  if (body.notificationPrefs) await updateWorkspaceField(user.id, "notification_prefs", body.notificationPrefs);

  return NextResponse.json({ ok: true });
}
