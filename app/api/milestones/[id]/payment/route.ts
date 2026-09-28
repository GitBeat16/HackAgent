import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { releasePayment, markPaymentPaid } from "@/lib/server/procurement";
import { z } from "zod";

const paymentSchema = z.object({
  action: z.enum(['release', 'mark_paid'])
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role, response } = await requireRole(["department_officer", "platform_admin"]);
    if (response) return response;

    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const milestoneId = (await params).id;

    if (parsed.data.action === 'release') {
      if (role !== 'department_officer') return NextResponse.json({ error: "Only officers can release payment" }, { status: 403 });
      await releasePayment(user.id, milestoneId);
    } else {
      if (role !== 'platform_admin') return NextResponse.json({ error: "Only admins can mark payment paid" }, { status: 403 });
      await markPaymentPaid(user.id, milestoneId);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === "FORBIDDEN" ? 403 : 500 });
  }
}
