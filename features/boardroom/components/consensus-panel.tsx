import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/shared/score-card";
import type { SeatedExecutive, SessionPhase } from "@/features/boardroom/types";

interface ConsensusPanelProps {
  executives: SeatedExecutive[];
  phase: SessionPhase;
  /** Set once the session has been finalized into a report. */
  reportId?: string;
  investmentScore?: number;
}

export function ConsensusPanel({ executives, phase, reportId, investmentScore }: ConsensusPanelProps) {
  const cast = executives.filter((exec) => exec.vote);
  const yes = cast.filter((exec) => exec.vote === "yes").length;
  const no = cast.filter((exec) => exec.vote === "no").length;
  const conditional = cast.filter((exec) => exec.vote === "conditional").length;

  // The board votes only at the end of the session, so before then there is
  // no ratio to take — guarding this is what keeps the score off NaN.
  const score = investmentScore ?? (cast.length ? Math.round((yes / cast.length) * 100) : 0);

  return (
    <Card className="p-0">
      <CardHeader>
        <CardTitle className="text-base">{phase === "complete" ? "Board decision" : "Consensus so far"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <ScoreCard
          label={phase === "complete" ? "Investment score" : "Running score"}
          score={score}
          verdict={
            cast.length
              ? `${yes} yes · ${conditional} conditional · ${no} no`
              : phase === "finalizing"
                ? "Tallying the vote…"
                : "The board votes once the debate ends."
          }
          size="md"
        />
        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-elevated p-2.5">
            <p className="font-mono text-base font-semibold text-success">{yes}</p>
            <p className="text-[0.7rem] text-muted-foreground">Yes</p>
          </div>
          <div className="rounded-lg bg-surface-elevated p-2.5">
            <p className="font-mono text-base font-semibold text-warning">{conditional}</p>
            <p className="text-[0.7rem] text-muted-foreground">Conditional</p>
          </div>
          <div className="rounded-lg bg-surface-elevated p-2.5">
            <p className="font-mono text-base font-semibold text-destructive">{no}</p>
            <p className="text-[0.7rem] text-muted-foreground">No</p>
          </div>
        </div>

        {phase === "finalizing" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Writing the report, market research and deck…
          </p>
        )}

        {reportId && (
          <Button size="sm" className="w-full" asChild>
            <Link href={`/reports/${reportId}`}>
              Read the full report
              <ArrowRight />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
