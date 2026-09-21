import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { user, response } = await requireRole("platform_admin");
  if (response) return response;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ logs: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 });
  }
}