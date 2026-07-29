"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExecutiveCard, type ExecutiveRole } from "@/components/shared/executive-card";
import { Badge } from "@/components/ui/badge";
import { ScoreCard } from "@/components/shared/score-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { fetchExecutives } from "@/features/executives/service";
import type { ExecutiveProfile } from "@/features/executives/types";

const roles: Array<ExecutiveRole | "All"> = [
  "All",
  "CEO Agent",
  "CTO Agent",
  "CFO Agent",
  "CMO Agent",
  "VC Agent",
  "Legal Agent",
  "Research Agent",
  "Growth Agent",
];

export function ExecutiveDirectory() {
  const [roleFilter, setRoleFilter] = useState<ExecutiveRole | "All">("All");
  const [selected, setSelected] = useState<ExecutiveProfile | null>(null);
  const [roster, setRoster] = useState<ExecutiveProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutives()
      .then(setRoster)
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(
    () => (roleFilter === "All" ? (roster ?? []) : (roster ?? []).filter((e) => e.role === roleFilter)),
    [roleFilter, roster],
  );

  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;
  if (!roster) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <button key={role} type="button" onClick={() => setRoleFilter(role)}>
            <Badge tone={roleFilter === role ? "brass" : "muted"} className="cursor-pointer px-3 py-1">
              {role}
            </Badge>
          </button>
        ))}
      </div>

      <motion.div
        key={roleFilter}
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.06)}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((exec) => (
          <motion.div key={exec.id} variants={fadeUp}>
            <ExecutiveCard
              name={exec.name}
              role={exec.role}
              trait={exec.trait}
              quote={exec.quote}
              presence={exec.presence}
              onClick={() => setSelected(exec)}
            />
          </motion.div>
        ))}
      </motion.div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.role}</DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-muted-foreground">{selected.bio}</p>
              <div className="flex flex-wrap gap-2">
                {selected.focusAreas.map((area) => (
                  <Badge key={area} tone="outline">
                    {area}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-4">
                <div>
                  <p className="font-mono text-lg font-semibold text-foreground">{selected.sessionsRun}</p>
                  <p className="text-xs text-muted-foreground">Sessions run</p>
                </div>
                <ScoreCard label="Agreement rate" score={selected.agreementRate} tone="signal" size="sm" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
