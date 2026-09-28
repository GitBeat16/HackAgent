import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireRole("department_officer");
    if (response) return response;

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const domain = formData.get('domain') as string;
    const budgetInr = formData.get('budgetInr') as string;
    const deadline = formData.get('deadline') as string;
    const datasetFile = formData.get('datasetFile') as File | null;

    if (!title || !description || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    let datasetUrl = null;
    if (datasetFile && datasetFile.size > 0) {
      const fileExt = datasetFile.name.split('.').pop();
      const fileName = `datasets/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('procurement-documents')
        .upload(fileName, datasetFile);

      if (uploadError) {
        return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
      }
      datasetUrl = fileName;
    }

    const { data, error } = await supabase.from('challenges').insert({
      department_id: user.id,
      title,
      description,
      domain,
      budget_inr: budgetInr ? parseInt(budgetInr) : null,
      deadline: deadline || null,
      status: 'open',
      dataset_url: datasetUrl
    }).select('id').single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "DB error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: unknown) {
    console.error("Create challenge error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: (error as { code?: string })?.code === 'FORBIDDEN' ? 403 : 500 });
  }
}
