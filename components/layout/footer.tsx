import Link from "next/link";
import { Building2 } from "lucide-react";

const footerColumns = [
  {
    heading: "Platform",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "My Proposals", href: "/my-proposals" },
      { label: "Challenges", href: "/challenges" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Ministry Guidelines", href: "#" },
      { label: "SIH Helpdesk", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="container grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </span>
            <span className="font-display text-lg font-medium tracking-tight">HackAgent Gov</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The official government platform for AI-evaluated startup procurement. Built for SIH 2026.
          </p>
        </div>

        {footerColumns.map((column) => (
          <div key={column.heading}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{column.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col-reverse items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} HackAgent / SIH 26136. Open Source.</p>
          <p className="text-xs text-muted-foreground">This is a Hackathon project and not a real government portal.</p>
        </div>
      </div>
    </footer>
  );
}
