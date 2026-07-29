import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { CapTableRow } from "@/features/financials/types";

export function CapTable({ rows }: { rows: CapTableRow[] }) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0">
        <CardTitle className="text-base">Cap table</CardTitle>
      </CardHeader>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.holder} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-foreground">{row.holder}</span>
              <span className="font-mono text-muted-foreground">{row.ownership}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div className="h-full rounded-full bg-primary" style={{ width: `${row.ownership}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{row.role}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
