import { NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/server/workspace";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const profile = await getProfile(user.id);

  return NextResponse.json({
    profile: {
      displayName: profile.display_name,
      email: profile.email ?? user.email,
      title: profile.title,
      role: profile.role,
    }
  });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as {
    profile?: { displayName?: string; email?: string; title?: string; workspaceName?: string };
  };

  if (body.profile) await updateProfile(user.id, body.profile);

  return NextResponse.json({ ok: true });
}
