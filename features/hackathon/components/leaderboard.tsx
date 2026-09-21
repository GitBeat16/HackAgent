import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/features/hackathon/types";

const rankTone = ["text-primary", "text-muted-foreground", "text-muted-foreground"];

export function Leaderboard({ leaderboard }: { leaderboard: LeaderboardRow[] }) {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Team</th>
              <th className="px-5 py-3 font-medium">Idea</th>
              <th className="px-5 py-3 font-medium text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-muted-foreground">
                  No scores posted yet.
                </td>
              </tr>
            )}
            {leaderboard.map((row) => (
              <tr key={row.rank} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <span className={cn("flex items-center gap-1.5 font-mono font-semibold", rankTone[row.rank - 1] ?? "text-muted-foreground")}>
                    {row.rank === 1 && <Trophy className="size-3.5" />}
                    {row.rank}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-foreground">{row.team}</td>
                <td className="px-5 py-3 text-muted-foreground">{row.idea}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
