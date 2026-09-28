
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { runEligibilityScreening } from "@/lib/server/procurement";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("department_officer");
    if (response) return response;

    const result = await runEligibilityScreening(user.id, (await params).id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("Screening error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === "FORBIDDEN" ? 403 : 500 });
  }
}

