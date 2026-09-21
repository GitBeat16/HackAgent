import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { createChallenge } from "@/lib/server/procurement";
import { CreateChallengeRequestSchema } from "@/types/api";

export async function POST(req: Request) {
  const { user, role, response } = await requireRole("department_officer");
  if (response) return response;

  try {
    const body = await req.json();
    const input = CreateChallengeRequestSchema.parse(body);
    const result = await createChallenge(user!.id, input);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, code: error.code || "BAD_REQUEST" }, { status: 400 });
  }
}