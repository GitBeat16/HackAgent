import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/server/env";

/** Unauthenticated on purpose: it reports whether the app is configured, never any data. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    dbConfigured: db.isConfigured,
    aiConfigured: isAiConfigured(),
    timestamp: new Date().toISOString(),
  });
}
