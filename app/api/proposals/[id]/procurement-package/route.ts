import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { buildProcurementPackage } from "@/lib/server/export-builder";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role, response } = await requireRole(["department_officer", "platform_admin", "startup"]);
    if (response) return response;

    const proposalId = (await params).id;
    const pkg = await buildProcurementPackage(proposalId);

    return new NextResponse(JSON.stringify(pkg, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="procurement-package-${proposalId}.json"`
      }
    });
  } catch (error: unknown) {
    console.error("Export error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }
}
