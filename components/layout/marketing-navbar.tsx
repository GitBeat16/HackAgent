"use client";

import Link from "next/link";
import { Gavel, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const marketingLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "The board", href: "#executives" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/**
 * Top nav for unauthenticated marketing pages. Transparent over the hero,
 * solidifies to `.glass` on scroll — handled with a plain CSS backdrop
 * rather than a scroll listener, since the header is always sticky here.
 */
export function MarketingNavbar({ className }: { className?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={cn("glass sticky top-0 z-40 border-b border-border/60", className)}>
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Gavel className="size-4" />
          </span>
          <span className="font-display text-lg font-medium tracking-tight">BoardroomAI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {marketingLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login?next=/meeting/new">Start free</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-foreground md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="glass border-t border-border/60 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {marketingLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login?next=/meeting/new">Start free</Link>
              </Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
