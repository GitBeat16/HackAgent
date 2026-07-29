import { NextResponse } from "next/server";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";

/** Route handlers use this before reading or mutating user-owned data. */
export async function requireUser() {
  if (!isSupabaseConfigured()) return { user: null, response: NextResponse.json({ error: "Supabase is not configured.", code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 }) };
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sign in is required.", code: "UNAUTHORIZED" }, { status: 401 }) };
  return { user, response: null };
}
