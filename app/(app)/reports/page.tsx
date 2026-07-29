import { SectionHeader } from "@/components/shared/section-header";
import { ReportsList } from "@/features/reports/components/reports-list";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Intelligence" title="Reports" description="Every board decision, generated and archived automatically." />
      <ReportsList />
    </div>
  );
}
