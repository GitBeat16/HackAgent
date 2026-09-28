"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FileText, ArrowRight, UserCircle } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function DashboardContent({ userName }: { userName: string }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('role').eq('id', data.user.id).single().then((res) => {
          setRole(res.data?.role || null);
        });
      }
    });
  }, []);

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-8">
      <SectionHeader
        eyebrow="Platform Overview"
        title={`Welcome to HackAgent, ${userName}`}
        description="The SIH 26136 Official Platform for Government-Startup Innovation."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="border border-border rounded-xl p-6 bg-surface/50">
          <Building2 className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Government Officials</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Define outcome-based problem statements and evaluate innovative solutions from startups using our AI panel.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full justify-between" disabled={role === 'startup_founder'}>
              <Link href="/challenges/new">Post a New Challenge <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-xl p-6 bg-surface/50">
          <FileText className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Startups & Innovators</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Discover public challenges, submit pilot proposals, and fast-track your government contracts.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full justify-between" variant="secondary" disabled={role === 'department_officer'}>
              <Link href="/marketplace">Browse Challenge Marketplace <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-8 flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/settings"><UserCircle className="w-4 h-4 mr-2" /> Complete your Profile</Link>
        </Button>
      </div>
    </div>
  );
}
