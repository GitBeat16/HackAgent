import { requireUser } from "@/lib/server/auth";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee } from "lucide-react";
import { MilestoneClient } from "@/features/procurement-pipeline/components/milestone-client";

export default async function ProposalTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const proposalId = (await params).id;

  const { data: proposal } = await supabase
    .from("procurement_proposals")
    .select("*, challenges(title, domain), pilot_plans(*, pilot_kpis(*))")
    .eq("id", proposalId)
    .eq("startup_id", user.id)
    .single();

  if (!proposal) notFound();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  const plan = proposal.pilot_plans?.[0];

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <SectionHeader 
        title={proposal.challenges?.title || "Pilot Tracker"} 
        description={`Status: ${proposal.status.toUpperCase()}`}
      />

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>Pilot KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-muted-foreground mb-2">
              <div>KPI</div>
              <div>Baseline</div>
              <div>Target</div>
              <div>Actual (Measured)</div>
            </div>
            {plan.pilot_kpis?.map((kpi: { id: string; name: string; metric_name?: string; target: number; target_value?: number; baseline: number; baseline_value?: number; actual: number; unit: string }) => (
              <div key={kpi.id} className="grid grid-cols-4 gap-4 text-sm py-2 border-t">
                <div>{kpi.name} ({kpi.unit})</div>
                <div>{kpi.baseline}</div>
                <div>{kpi.target}</div>
                <div>{kpi.actual !== null ? kpi.actual : "Pending"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Milestones & Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {milestones?.map((m: { id: string, title: string, description: string, status: string, payment_status: string, payment_inr: number, is_on_time?: boolean, days_to_payment?: number }, idx: number) => (
            <div key={m.id} className="border p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{idx + 1}. {m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </div>
                <div className="text-right">
                  <Badge tone="outline" className="mb-2">{m.status.toUpperCase()}</Badge>
                  <div className="flex items-center text-emerald-600 font-medium">
                    <IndianRupee className="w-4 h-4 mr-1" />
                    {m.payment_inr.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Payment: {m.payment_status}</div>
                  {m.is_on_time !== undefined && m.is_on_time !== null && m.payment_status === 'paid' && (
                    <div className={`text-[10px] font-bold mt-1 ${m.is_on_time ? 'text-emerald-500' : 'text-destructive'}`}>
                      {m.is_on_time ? `ON-TIME (${m.days_to_payment} days)` : `LATE (${m.days_to_payment} days)`}
                    </div>
                  )}
                </div>
              </div>
              
              <MilestoneClient milestone={m} isStartup={true} />
            </div>
          ))}
          {(!milestones || milestones.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No milestones defined yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
