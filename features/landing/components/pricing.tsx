"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { pricingTiers } from "@/features/landing/mock";

export function Pricing() {
  return (
    <section id="pricing" className="container py-24">
      <SectionHeader
        eyebrow="Pricing"
        title="Bring an idea for free. Bring a fundraise for real."
        description="No seat minimums to start. Upgrade when the board becomes part of how you build."
      />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer(0.08)}
        className="mt-12 grid gap-6 lg:grid-cols-3"
      >
        {pricingTiers.map((tier) => (
          <motion.div key={tier.name} variants={fadeUp}>
            <Card
              className={cn(
                "flex h-full flex-col gap-6 p-7",
                tier.highlighted && "border-primary/50 shadow-glow",
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-medium">{tier.name}</h3>
                  {tier.highlighted && <Badge tone="brass">Most founders pick this</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.cadence}</span>
              </div>

              <ul className="flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant={tier.highlighted ? "primary" : "secondary"} asChild>
                <Link href="/meeting/new">{tier.ctaLabel}</Link>
              </Button>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
