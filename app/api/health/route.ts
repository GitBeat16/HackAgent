import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/server/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  let procurementMigrated = false;
  
  if (db.isConfigured) {
    try {
      const { data, error } = await supabase.from('procurement_proposals').select('id').limit(1);
      procurementMigrated = !error;
    } catch {
      procurementMigrated = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    dbConfigured: db.isConfigured,
    aiConfigured: isAiConfigured(),
    procurementMigrated,
    timestamp: new Date().toISOString(),
  });
}
