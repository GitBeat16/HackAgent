
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { approveProposalWithMilestones } from "@/lib/server/procurement";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("department_officer");
    if (response) return response;

    const { z } = await import("zod");
    
    const approveSchema = z.object({
      milestones: z.array(z.object({
        title: z.string(),
        description: z.string(),
        paymentInr: z.number(),
        dueDate: z.string().optional()
      })),
      pilotPlan: z.object({
        durationWeeks: z.number(),
        scopeDescription: z.string(),
        constraints: z.string(),
        kpis: z.array(z.object({
          name: z.string(),
          unit: z.string(),
          baseline: z.number(),
          target: z.number()
        }))
      }),
      overrideReason: z.string().optional()
    });

    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const { milestones, pilotPlan, overrideReason } = parsed.data;

    await approveProposalWithMilestones(user.id, (await params).id, milestones, pilotPlan, overrideReason);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Approval error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === "FORBIDDEN" ? 403 : 500 });
  }
}

