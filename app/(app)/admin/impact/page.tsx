import React from 'react';
import { ImpactOverview } from '@/features/impact-dashboard/components/impact-overview';

export default function ImpactDashboardPage() {
  // In a real app this would fetch live metrics from /api/admin/metrics
  const mockMetrics = {
    totalChallenges: 42,
    totalProposals: 156,
    activePilots: 14,
    completedPilots: 3,
    totalBudgetDeployed: 25000000
  };

  return (
    <div className="container mx-auto p-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Impact</h1>
        <p className="text-muted-foreground mt-1">Cross-department visibility into the startup procurement funnel.</p>
      </div>
      <ImpactOverview metrics={mockMetrics} />
      
      {/* Real app would add Before-After tables and Audit logs here */}
      <div className="bg-muted/30 p-8 rounded-xl text-center text-muted-foreground border border-dashed border-border mt-8">
        Audit log viewer and Before/After metric tables go here.
      </div>
    </div>
  );
}
