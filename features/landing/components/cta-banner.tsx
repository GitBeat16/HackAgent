import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="container py-24">
      <div className="grain relative overflow-hidden rounded-3xl bg-boardroom-glow border border-border-strong px-8 py-16 text-center sm:px-16">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Ready when you are</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-balance font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Your board is already assembled.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          No scheduling. No prep deck. Submit your pitch and the debate starts in seconds.
        </p>
        <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/meeting/new">
              Start your pitch
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
