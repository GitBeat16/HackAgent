import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Search, ArrowRight, ShieldCheck, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link className="flex items-center justify-center gap-2" href="#">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">HackAgent Gov</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Login
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                  Government Procurement, <br/>
                  <span className="text-primary">Powered by AI</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  A unified marketplace for government departments to post outcome-based challenges, and startups to submit solutions.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full py-8 text-left">
                <div className="space-y-2 border p-6 rounded-xl bg-surface/50">
                  <Search className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">1. Discover Challenges</h3>
                  <p className="text-sm text-muted-foreground">Departments post outcome-based problem statements and eligibility criteria.</p>
                </div>
                <div className="space-y-2 border p-6 rounded-xl bg-surface/50">
                  <FileText className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">2. Submit Proposal</h3>
                  <p className="text-sm text-muted-foreground">Startups bid with technical architecture, timeline, and cost estimates.</p>
                </div>
                <div className="space-y-2 border p-6 rounded-xl bg-surface/50">
                  <ShieldCheck className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">3. Award & Pilot</h3>
                  <p className="text-sm text-muted-foreground">AI panels evaluate bids, humans approve pilots, and milestones are tracked.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="h-12 px-8 text-base">
                  <Link href="/login">
                    Enter Portal <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
