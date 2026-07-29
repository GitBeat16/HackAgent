import { ReportDetailView } from "@/features/reports/components/report-detail-view";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-8">
      <ReportDetailView id={id} />
    </div>
  );
}
