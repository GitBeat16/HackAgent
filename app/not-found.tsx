import Link from "next/link";
import { Gavel, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-6 bg-boardroom-glow px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Gavel className="size-6" />
      </span>
      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">The board didn't find this page</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          It may have moved, or the session it belonged to has ended.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
