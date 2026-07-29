import { TrendingUp, TrendingDown, Sparkles, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { SwotSection } from "@/features/reports/types";

const config = {
  Strengths: { icon: TrendingUp, tone: "text-success" },
  Weaknesses: { icon: TrendingDown, tone: "text-destructive" },
  Opportunities: { icon: Sparkles, tone: "text-signal" },
  Threats: { icon: ShieldAlert, tone: "text-warning" },
} as const;

export function SwotGrid({ swot }: { swot: SwotSection[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {swot.map((section) => {
        const { icon: Icon, tone } = config[section.title];
        return (
          <Card key={section.title} className="p-5">
            <CardHeader className="flex-row items-center gap-2 space-y-0 p-0">
              <Icon className={`size-4 ${tone}`} />
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
