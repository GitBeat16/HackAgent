import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { validateMilestone } from "@/lib/server/procurement";
import { z } from "zod";

const validateSchema = z.object({
  outcome: z.enum(['pass', 'fail', 'needs-rework']),
  notes: z.string()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("validator");
    if (response) return response;

    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    await validateMilestone(user.id, (await params).id, parsed.data.outcome, parsed.data.notes);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Validate error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === "FORBIDDEN" ? 403 : 500 });
  }
}
