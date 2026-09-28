import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { uploadAuxiliaryDocument } from "@/lib/server/procurement";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole('department_officer');
    if (response) return response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string;
    const documentTitle = formData.get('documentTitle') as string || file?.name || 'Document';

    if (!file || !documentType) {
      return NextResponse.json({ error: "Missing file or documentType" }, { status: 400 });
    }

    const supabase = await createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${(await params).id}/${Date.now()}.${fileExt}`;
    const storagePath = `auxiliary/${fileName}`;

    // Upload to Supabase Storage bucket 'procurement-documents'
    const { error: uploadError } = await supabase.storage
      .from('procurement-documents')
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    // Log the document into the database using our state machine
    await uploadAuxiliaryDocument(user.id, (await params).id, documentTitle, documentType, storagePath);

    return NextResponse.json({ success: true, storagePath });
  } catch (error: unknown) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === 'FORBIDDEN' ? 403 : 500 });
  }
}


