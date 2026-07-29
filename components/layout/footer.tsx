import Link from "next/link";
import { Gavel } from "lucide-react";

const footerColumns = [
  {
    heading: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Boardroom", href: "/boardroom" },
      { label: "Reports", href: "/reports" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "The board", href: "/executives" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Sample report", href: "/reports" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gavel className="size-4" />
            </span>
            <span className="font-display text-lg font-medium tracking-tight">BoardroomAI</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            A virtual board of AI executives that pressure-tests your startup before a real one does.
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
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BoardroomAI. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Every executive on this board is an AI persona, not a real person.</p>
        </div>
      </div>
    </footer>
  );
}
