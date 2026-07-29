import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/server/env";
import { isPiperAvailable } from "@/lib/speech/piper";

/** Piper's check touches the filesystem, which the edge runtime cannot do. */
export const runtime = "nodejs";

/** Unauthenticated on purpose: it reports whether the app is configured, never any data. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    dbConfigured: db.isConfigured,
    aiConfigured: isAiConfigured(),
    // False is not an error: the board falls back to Edge and then to the
    // browser's own voice. It answers "why does this deploy sound different".
    piperAvailable: isPiperAvailable(),
    timestamp: new Date().toISOString(),
  });
}
