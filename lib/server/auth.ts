import { NextResponse } from "next/server";
import { getCurrentUser, isSupabaseConfigured, createClient } from "@/lib/supabase/server";

/** Route handlers use this before reading or mutating user-owned data. */
export async function requireUser() {
  if (!isSupabaseConfigured()) return { user: null, response: NextResponse.json({ error: "Supabase is not configured.", code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 }) };
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sign in is required.", code: "UNAUTHORIZED" }, { status: 401 }) };
  return { user, response: null };
}

export async function requireRole(allowedRoles: string | string[]) {
  const { user, response } = await requireUser();
  if (response) return { user, role: null, response };
  
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (error || !data) return { user, role: null, response: NextResponse.json({ error: 'Unauthorized role.' }, { status: 403 }) };
    
    const role = data.role;
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!rolesArray.includes(role) && role !== 'platform_admin') {
      return { user, role: null, response: NextResponse.json({ error: 'Unauthorized role.' }, { status: 403 }) };
    }
    
    return { user, role, response: null };
  } catch (err) {
    console.error("Error in requireRole:", err);
    return { user, role: null, response: NextResponse.json({ error: 'Internal server error.' }, { status: 500 }) };
  }
}

