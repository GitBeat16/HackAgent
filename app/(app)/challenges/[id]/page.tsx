import { proposalSchema, sanitiseForPrompt } from "@/lib/server/validation";

import { requireUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IndianRupee, CalendarDays, ExternalLink } from "lucide-react";
import { submitProposal } from "@/lib/server/procurement";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { SubmitProposalForm } from "@/features/challenge-marketplace/components/submit-proposal-form";

export default async function ChallengeDetailPage({ params }: { params: { id: string } }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: challenge } = await supabase.from("challenges").select("*").eq("id", params.id).single();
  
  if (!challenge) notFound();

  // Check if they already applied
  const { data: existingProposal } = await supabase
    .from("procurement_proposals")
    .select("id")
    .eq("challenge_id", params.id)
    .eq("startup_id", user.id)
    .maybeSingle();

  // Fetch active/scaled pilots to show public KPIs
  const { data: activePilots } = await supabase
    .from("procurement_proposals")
    .select("id, status, profiles(startup_name), pilot_plans(duration_weeks, pilot_kpis(name, baseline_value, target_value, actual_value, unit))")
    .eq("challenge_id", params.id)
    .in("status", ["pilot_active", "scaled", "completed"]);

  // Check if they are the owner (officer)
  const isOwner = challenge.department_id === user.id;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <SectionHeader title={challenge.title} description={challenge.domain} />
        {isOwner && (
          <Button asChild>
            <Link href={`/challenges/${params.id}/pipeline`}>
              View Pipeline <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg"><IndianRupee className="text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Budget Allocated</p>
              <p className="font-semibold text-lg">{challenge.budget_inr ? `\u20B9${challenge.budget_inr.toLocaleString('en-IN')}` : "TBD"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg"><CalendarDays className="text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Deadline</p>
              <p className="font-semibold text-lg">{challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : "Open ended"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="prose prose-invert max-w-none">
        <h3>Problem Statement</h3>
        <p className="whitespace-pre-wrap">{challenge.description}</p>
        
        {challenge.eligibility_criteria && (
          <>
            <h3>Eligibility Criteria</h3>
            <p className="whitespace-pre-wrap">{challenge.eligibility_criteria}</p>
          </>
        )}
      </div>

      {activePilots && activePilots.length > 0 && (
        <div className="pt-8 border-t space-y-6">
          <h3 className="text-xl font-semibold">Active Pilots &amp; Live KPIs</h3>
          <div className="grid gap-6">
            {activePilots.map(pilot => {
              const plan = (pilot.pilot_plans as { duration_weeks: number; pilot_kpis: { name: string; target_value: number; baseline_value: number; actual_value: number | null; unit: string }[] }[] | null)?.[0];
              if (!plan) return null;
              const startupName = Array.isArray(pilot.profiles)
                ? (pilot.profiles[0] as { startup_name: string } | undefined)?.startup_name
                : (pilot.profiles as { startup_name: string } | null)?.startup_name;
              return (
                <Card key={pilot.id} className="border-emerald-500/30">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-lg">{startupName}</h4>
                      <Badge tone="outline" className="text-emerald-500">{pilot.status.replace(/_/g, ' ').toUpperCase()}</Badge>
                    </div>
                    <div className="space-y-4">
                      {plan.pilot_kpis?.map(kpi => (
                        <div key={kpi.name} className="flex justify-between items-center bg-muted/20 p-3 rounded-lg text-sm">
                          <span className="font-medium">{kpi.name}</span>
                          <div className="text-right space-x-4">
                            <span className="text-muted-foreground">Target: {kpi.target_value} {kpi.unit}</span>
                            <span className="font-semibold">Actual: {kpi.actual_value !== null ? kpi.actual_value : "Pending"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!isOwner && (
        <div className="pt-8 border-t">
          {existingProposal ? (
            <div className="bg-emerald-500/10 text-emerald-500 p-6 rounded-xl border border-emerald-500/20 text-center">
              <h3 className="font-semibold text-lg mb-2">Proposal Submitted</h3>
              <p>You have successfully submitted your proposal for this challenge.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/my-proposals">Track Status in My Proposals</Link>
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Submit your Proposal</h3>



                <SubmitProposalForm challengeId={params.id} submitAction={async (payload: unknown) => {
                  "use server";
                  const { user: actionUser } = await requireUser();
                  if (!actionUser) throw new Error("Unauthorized");
                  
                  const parsed = proposalSchema.safeParse(payload);
                  if (!parsed.success) {
                    throw new Error("Invalid proposal format: " + parsed.error.issues[0]?.message);
                  }
                  
                  const data = parsed.data;
                  const compiledText = `[Solution Type]: ${data.solutionType}\n\n[Architecture & Approach]:\n${data.architecture}\n\n[Implementation Timeline]:\n${data.timeline}\n\n[Estimated Cost]: ₹${data.cost}\n\n[Past Experience]:\n${data.pastExperience}`;
                  
                  const sanitized = sanitiseForPrompt(compiledText);
                  if (sanitized.length < 200) {
                    throw new Error("Proposal is too short.");
                  }

                  await submitProposal(actionUser.id, params.id, sanitized);
                  revalidatePath(`/challenges/${params.id}`);
                }} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
