import { requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Target, Users, CheckCircle } from "lucide-react";

export default async function AdminImpactPage() {
  const { user, response } = await requireRole("platform_admin");
  if (response || !user) redirect("/login");

  const supabase = await createClient();

  const [
    { count: challengesCount },
    { count: proposalsCount },
    { count: pilotsCount },
    { data: proposals }
  ] = await Promise.all([
    supabase.from("challenges").select("*", { count: "exact", head: true }),
    supabase.from("procurement_proposals").select("*", { count: "exact", head: true }),
    supabase.from("procurement_proposals").select("*", { count: "exact", head: true }).in("status", ["pilot_active", "scaled", "completed"]),
    supabase.from("procurement_proposals").select("ai_match_score").not("ai_match_score", "is", null)
  ]);

  const avgScore = proposals && proposals.length > 0
    ? (proposals.reduce((acc, p) => acc + (p.ai_match_score || 0), 0) / proposals.length).toFixed(1)
    : "N/A";

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <SectionHeader title="Platform Impact Dashboard" description="Aggregate metrics across all government departments." />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challengesCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposals Received</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposalsCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pilots</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pilotsCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg AI Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
