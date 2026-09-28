import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { recordScaleDecision } from "@/lib/server/procurement";
import { z } from "zod";

const scaleSchema = z.object({
  decision: z.enum(['Scale', 'Extend', 'Terminate']),
  pathway: z.enum(['GeM Listing', 'Open Tender', 'Cross-Department', 'None']),
  reason: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("department_officer");
    if (response) return response;

    const body = await req.json();
    const parsed = scaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    await recordScaleDecision(user.id, (await params).id, parsed.data.decision, parsed.data.pathway, parsed.data.reason);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Scale decision error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === "FORBIDDEN" ? 403 : 500 });
  }
}
