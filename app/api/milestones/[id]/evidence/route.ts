import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { uploadMilestoneEvidence } from "@/lib/server/procurement";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole(['startup', 'startup_founder']);
    if (response) return response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentTitle = formData.get('documentTitle') as string || file?.name || 'Evidence Document';

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const supabase = await createClient();
    const fileExt = file.name.split('.').pop();
    const milestoneId = (await params).id;
    const fileName = `milestones/${milestoneId}/${Date.now()}.${fileExt}`;
    const storagePath = `evidence/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('procurement-documents')
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    await uploadMilestoneEvidence(user.id, milestoneId, documentTitle, storagePath);

    return NextResponse.json({ success: true, storagePath });
  } catch (error: unknown) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === 'FORBIDDEN' ? 403 : 500 });
  }
}
