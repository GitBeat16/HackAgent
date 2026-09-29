import { requireUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function TemplatesPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const templates = [
    {
      id: "pilot_agreement_draft",
      title: "Pilot Agreement Draft",
      description: "Standard agreement covering scope, duration, milestones, payment terms, data/IP clauses, and exit/termination clauses.",
      icon: FileText
    },
    {
      id: "cybersecurity_checklist",
      title: "Cybersecurity Checklist",
      description: "Generic checklist for data classification, hosting, access control, incident response, and audit rights.",
      icon: Shield
    },
    {
      id: "risk_register_template",
      title: "Risk Register Template",
      description: "A blank tabular structure (risk, likelihood, impact, mitigation, owner) for officers to fill in manually.",
      icon: AlertTriangle
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      <div className="space-y-2">
        <SectionHeader 
          title="Procurement Templates Library" 
          description="Static reference documents for offline pilot management and compliance." 
        />
        <p className="text-sm text-muted-foreground bg-blue-50/50 p-3 border border-blue-100 rounded-md">
          <strong>Note:</strong> These are static reference templates intended for manual offline use, not AI-generated per-proposal documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <Icon className="w-8 h-8 mb-2 text-primary/80" />
                <CardTitle className="text-lg">{tpl.title}</CardTitle>
                <CardDescription className="text-sm">{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4">
                <Link href={`/api/templates/${tpl.id}`} target="_blank">
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
