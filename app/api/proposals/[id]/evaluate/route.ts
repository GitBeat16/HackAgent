import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { queueAiEvaluation, recordEvaluationResult } from "@/lib/server/procurement";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole("department_officer");
  if (response) return response;

  try {
    const { id } = await params;
    // Note: real implementation would queue a background task. For now, simulate.
    await queueAiEvaluation(user!.id, id, "00000000-0000-0000-0000-000000000000");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, code: error.code || "BAD_REQUEST" }, { status: 400 });
  }
}
