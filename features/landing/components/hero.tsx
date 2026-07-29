"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/shared/score-card";
import { Badge } from "@/components/ui/badge";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { heroStats } from "@/features/landing/mock";

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="grain relative overflow-hidden bg-boardroom-glow">
      <div className="container grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <motion.div
          initial={reducedMotion ? undefined : "hidden"}
          animate="visible"
          variants={staggerContainer(0.08)}
          className="relative z-10 space-y-7"
        >
          <motion.div variants={fadeUp}>
            <Badge tone="signal" pulse>
              Live board session running now
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Pitch to a board that never adjourns.
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Eight AI executives — CEO, CFO, CTO, VC, and more — debate your startup live, then hand you the
            investment decision, financials, and roadmap a real board takes weeks to produce.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link href="/meeting/new">
                Start your pitch
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/reports">
                <PlayCircle />
                See a sample report
              </Link>
            </Button>
          </motion.div>

          <motion.dl variants={fadeUp} className="grid max-w-lg grid-cols-3 gap-6 pt-4">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <dd className="font-mono text-2xl font-semibold tracking-tight text-foreground">{stat.value}</dd>
                <dt className="mt-1 text-xs text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="glass-elevated relative mx-auto flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl p-8"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Board consensus — live
          </p>
          <ScoreCard label="Investment score" score={87} verdict="Strong buy signal, 6–2 in favor" tone="brass" size="lg" />
          <div className="grid w-full grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-surface-elevated p-3">
              <p className="font-mono text-lg font-semibold text-success">6</p>
              <p className="text-xs text-muted-foreground">Voted yes</p>
            </div>
            <div className="rounded-lg bg-surface-elevated p-3">
              <p className="font-mono text-lg font-semibold text-destructive">2</p>
              <p className="text-xs text-muted-foreground">Voted no</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
