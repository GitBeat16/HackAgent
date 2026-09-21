import { NextResponse } from "next/server";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";

/** Route handlers use this before reading or mutating user-owned data. */
export async function requireUser() {
  if (!isSupabaseConfigured()) return { user: null, response: NextResponse.json({ error: "Supabase is not configured.", code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 }) };
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sign in is required.", code: "UNAUTHORIZED" }, { status: 401 }) };
  return { user, response: null };
}
import { getProfile } from "@/lib/server/workspace";
import type { UserRole } from "@/types/api";

export async function requireRole(expected: UserRole) {
  const { user, response } = await requireUser();
  if (response) return { user: null, role: null, response };
  
  const profile = await getProfile(user.id);
  
  if (profile.role !== expected && profile.role !== "platform_admin") {
    return { user: null, role: null, response: NextResponse.json(
      { error: "Forbidden.", code: "FORBIDDEN" }, { status: 403 }
    )};
  }

  // Enforce MFA for high-privilege roles
  // Note: user.factors comes from Supabase Auth MFA
  const hasMfa = user.factors && user.factors.length > 0;
  if ((profile.role === "department_officer" || profile.role === "platform_admin") && !hasMfa) {
    // Return 403 with specific code so UI can prompt for MFA enrollment
    // return { user: null, role: null, response: NextResponse.json(
    //   { error: "MFA required for this role.", code: "MFA_REQUIRED" }, { status: 403 }
    // )};
    // Disabled strict MFA block for hackathon/demo purposes, but architectural hook is here.
  }

  return { user, role: profile.role, response: null };
}
