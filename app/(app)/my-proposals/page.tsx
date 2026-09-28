
import { requireUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MyProposalsPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: proposals } = await supabase
    .from("procurement_proposals")
    .select("id, status, submitted_at, ai_match_score, challenges(title, domain)")
    .eq("startup_id", user.id)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <SectionHeader 
        title="My Proposals" 
        description="Track the status of your pilot applications to government challenges." 
      />

      {(!proposals || proposals.length === 0) ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-surface/30">
          <p className="text-muted-foreground">You have not submitted any proposals yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {proposals.map((p: { id: string, status: string, challenges?: { title: string; domain: string } | { title: string; domain: string }[], submitted_at: string, ai_match_score?: number }) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="mb-2" tone="outline">{(Array.isArray(p.challenges) ? p.challenges[0]?.domain : p.challenges?.domain)}</Badge>
                    <CardTitle className="text-lg">{(Array.isArray(p.challenges) ? p.challenges[0]?.title : p.challenges?.title)}</CardTitle>
                    <CardDescription>Submitted on {new Date(p.submitted_at).toLocaleDateString()}</CardDescription>
                  </div>
                  <Badge tone="success" className="uppercase">{p.status.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {p.ai_match_score !== null ? (
                    <span className="text-emerald-500 font-medium">AI Match Score: {p.ai_match_score}</span>
                  ) : (
                    <span>Pending Evaluation</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
