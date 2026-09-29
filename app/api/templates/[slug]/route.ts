import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const slug = (await params).slug;
    
    // Sanitize slug to prevent directory traversal
    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
    
    const filePath = path.join(process.cwd(), "content", "templates", `${safeSlug}.md`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${safeSlug}.md"`
      }
    });
  } catch (error) {
    console.error("Template download error:", error);
    return NextResponse.json({ error: "Failed to download template" }, { status: 500 });
  }
}
