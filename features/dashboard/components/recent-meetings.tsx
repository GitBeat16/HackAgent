import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecentMeeting } from "@/features/dashboard/types";

const statusTone: Record<RecentMeeting["status"], "signal" | "success" | "muted"> = {
  "in-progress": "signal",
  completed: "success",
  scheduled: "muted",
};

const statusLabel: Record<RecentMeeting["status"], string> = {
  "in-progress": "In session",
  completed: "Completed",
  scheduled: "Scheduled",
};

export function RecentMeetings({ meetings }: { meetings: RecentMeeting[] }) {
  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Recent meetings</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/boardroom">
            View all
            <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {meetings.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">No meetings yet. Start one from New meeting.</p>
        ) : (
          meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={meeting.reportId ? `/reports/${meeting.reportId}` : `/boardroom?meeting=${meeting.id}`}
              className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-surface-elevated"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{meeting.startupName}</p>
                <p className="truncate text-xs text-muted-foreground">{meeting.oneLiner}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {meeting.investmentScore !== undefined && (
                  <span className="font-mono text-sm font-medium text-foreground">{meeting.investmentScore}</span>
                )}
                <Badge tone={statusTone[meeting.status]} pulse={meeting.status === "in-progress"}>
                  {statusLabel[meeting.status]}
                </Badge>
                <span className="hidden text-xs text-muted-foreground sm:block">{meeting.updatedAt}</span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
