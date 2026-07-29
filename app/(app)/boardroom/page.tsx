import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardroomSession } from "@/features/boardroom/components/boardroom-session";

export default function BoardroomPage() {
  return (
    // BoardroomSession reads `?meeting=` via useSearchParams, which needs a
    // Suspense boundary to keep this route statically renderable.
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BoardroomSession />
    </Suspense>
  );
}
