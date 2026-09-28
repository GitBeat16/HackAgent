
import { requireUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function DepartmentChallengesPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, procurement_proposals(id)")
    .eq("department_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <SectionHeader 
        title="Department Challenges" 
        description="Manage the problem statements you have posted for startups to solve." 
        action={<Button asChild><Link href="/challenges/new">Post New Challenge</Link></Button>}
      />

      {(!challenges || challenges.length === 0) ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-surface/30">
          <p className="text-muted-foreground">You have not posted any challenges yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {challenges.map((c: { id: string, title: string, department_name: string, domain: string, status: string, budget_inr: number, created_at: string, description: string, procurement_proposals: unknown[] }) => (
            <Card key={c.id}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="mb-2">{c.domain}</Badge>
                    <CardTitle className="text-xl">{c.title}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">{c.description}</CardDescription>
                  </div>
                  <Badge tone={c.status === "open" ? "success" : "muted"}>{c.status.toUpperCase()}</Badge>
                </div>
              </CardHeader>
              <CardFooter className="bg-muted/10 border-t pt-4 flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {c.procurement_proposals?.length || 0} Proposals Received
                </span>
                <Button asChild variant="outline">
                  <Link href={`/challenges/${c.id}/pipeline`}>
                    View Kanban Pipeline <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
