import { requireUser } from "@/lib/server/auth";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReport } from "@/lib/server/reports";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreCard } from "@/components/shared/score-card";
import { RadarChart } from "@/components/shared/radar-chart";
import { ExecutiveCard } from "@/components/shared/executive-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

export default async function ProposalEvaluationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const proposalId = (await params).id;

  const { data: proposal } = await supabase
    .from("procurement_proposals")
    .select("*, challenges(title)")
    .eq("id", proposalId)
    .single();

  if (!proposal || !proposal.report_id) {
    notFound();
  }

  const report = await getReport(user.id, proposal.report_id);
  if (!report) {
    notFound();
  }

  // Format dimensions for RadarChart
  const radarData = Object.entries(report.dimensions || {}).map(([dim, score]) => ({
    dimension: dim,
    Score: score
  }));

  const radarSeries = [{ key: "Score", label: "AI Evaluation Score" }];

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <SectionHeader 
          title="AI Evaluation Report" 
          description={`Analysis for: ${report.startupName} — ${(Array.isArray(proposal.challenges) ? proposal.challenges[0] : proposal.challenges as { title?: string })?.title || 'Proposal'}`}
        />
        <Button variant="outline" asChild>
          <Link href={`/challenges/${proposal.challenge_id}/pipeline`}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Pipeline</Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <ScoreCard 
          label="Procurement AI Score" 
          score={report.feasibilityScore} 
          verdict={report.verdict}
          tone={report.verdict === "Recommend Pilot" ? "success" : report.verdict === "Conditional Pilot" ? "warning" : "destructive"}
        />

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{report.executiveSummary}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dimensional Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            {radarData.length > 0 ? (
              <RadarChart data={radarData} series={radarSeries} />
            ) : (
              <div className="text-muted-foreground flex items-center justify-center h-full">No dimensional data available.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Register</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {report.risks && report.risks.length > 0 ? (
                report.risks.map((r, i) => (
                  <div key={i} className="border-l-4 pl-4 py-2 border-l-destructive/50 bg-destructive/5 rounded-r">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{r.risk}</span>
                      <Badge tone={r.level === "High" ? "destructive" : r.level === "Medium" ? "warning" : "success"}>{r.level} Risk</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Mitigation: {r.mitigation}</p>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">No critical risks identified.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SWOT Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            {report.swot && report.swot.map((section, idx) => (
              <div key={idx} className="space-y-3 p-4 rounded-lg bg-surface/50 border">
                <h4 className={`font-semibold flex items-center gap-2 ${
                  section.title === 'Strengths' ? 'text-emerald-500' :
                  section.title === 'Weaknesses' ? 'text-rose-500' :
                  section.title === 'Opportunities' ? 'text-blue-500' : 'text-amber-500'
                }`}>
                  {section.title === 'Strengths' && <CheckCircle2 className="w-4 h-4" />}
                  {section.title === 'Weaknesses' && <XCircle className="w-4 h-4" />}
                  {section.title === 'Opportunities' && <TargetIcon />}
                  {section.title === 'Threats' && <AlertTriangle className="w-4 h-4" />}
                  {section.title}
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {section.points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {report.executiveVotes && report.executiveVotes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Executive Panel Votes</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.executiveVotes.map((vote) => (
              <Card key={vote.executiveId} className={`border-l-4 ${vote.vote === 'yes' ? 'border-l-emerald-500' : vote.vote === 'no' ? 'border-l-rose-500' : 'border-l-amber-500'}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <ExecutiveCard id={vote.executiveId} name={vote.executiveName} role={vote.role} trait="" size="sm" />
                    <Badge tone={vote.vote === 'yes' ? 'success' : vote.vote === 'no' ? 'destructive' : 'warning'}>
                      {vote.vote.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{vote.rationale}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
