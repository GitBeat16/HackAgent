import { requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Target, Users, CheckCircle, Zap, TrendingUp, Clock } from "lucide-react";
import { computeMedian, computeSuccessRate, computeScaleUpRate } from "@/lib/server/impact-metrics";

export default async function AdminImpactPage() {
  const { user, response } = await requireRole("platform_admin");
  if (response || !user) redirect("/login");

  const supabase = await createClient();

  const [
    { count: challengesCount },
    { count: proposalsCount },
    { count: pilotsCount },
    { data: proposals },
    { data: paidMilestones },
    { data: pilotPlans },
    { data: scaleDecisions }
  ] = await Promise.all([
    supabase.from("challenges").select("*", { count: "exact", head: true }),
    supabase.from("procurement_proposals").select("*", { count: "exact", head: true }),
    supabase.from("procurement_proposals").select("*", { count: "exact", head: true }).in("status", ["pilot_active", "scaled", "completed"]),
    supabase.from("procurement_proposals").select("ai_match_score").not("ai_match_score", "is", null),
    supabase.from("milestones").select("is_on_time").eq("payment_status", "paid"),
    supabase.from("pilot_plans").select("created_at, procurement_proposals!inner(challenges!inner(created_at))"),
    supabase.from("scale_decisions").select("decision")
  ]);

  const avgScore = proposals && proposals.length > 0
    ? (proposals.reduce((acc, p) => acc + (p.ai_match_score || 0), 0) / proposals.length).toFixed(1)
    : "N/A";

  const totalPaid = paidMilestones?.length || 0;
  const onTimePaid = paidMilestones?.filter(m => m.is_on_time === true).length || 0;
  const onTimePercentage = totalPaid > 0 ? ((onTimePaid / totalPaid) * 100).toFixed(1) + "%" : "N/A";

  // Calculate Median Days to Pilot Start
  const daysToStart = (pilotPlans || []).map((plan: unknown) => {
    const p = plan as { created_at?: string, procurement_proposals?: { challenges?: { created_at?: string } | { created_at?: string }[] } | { challenges?: { created_at?: string } | { created_at?: string }[] }[] };
    
    let challengeCreatedAt: string | null = null;
    if (p.procurement_proposals) {
      const prop = Array.isArray(p.procurement_proposals) ? p.procurement_proposals[0] : p.procurement_proposals;
      if (prop && prop.challenges) {
        const chal = Array.isArray(prop.challenges) ? prop.challenges[0] : prop.challenges;
        if (chal && chal.created_at) {
          challengeCreatedAt = chal.created_at;
        }
      }
    }
      
    const planCreatedAt = p.created_at;
    if (challengeCreatedAt && planCreatedAt) {
      return Math.max(0, Math.floor((new Date(planCreatedAt).getTime() - new Date(challengeCreatedAt).getTime()) / (1000 * 60 * 60 * 24)));
    }
    return null;
  }).filter((days: number | null) => days !== null) as number[];

  const medianDays = computeMedian(daysToStart);
  const medianDaysDisplay = medianDays !== null ? `${medianDays} days` : "N/A";

  // Calculate Rates
  const decisions = (scaleDecisions || []).map(d => d.decision);
  const successRateNum = computeSuccessRate(decisions);
  const scaleUpRateNum = computeScaleUpRate(decisions);

  const successRateDisplay = successRateNum !== null ? `${successRateNum.toFixed(1)}%` : "N/A";
  const scaleUpRateDisplay = scaleUpRateNum !== null ? `${scaleUpRateNum.toFixed(1)}%` : "N/A";

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTimePercentage}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Time to Pilot</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medianDaysDisplay}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pilot Success Rate</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRateDisplay}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scale-up Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scaleUpRateDisplay}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
