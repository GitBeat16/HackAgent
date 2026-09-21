"use client";

import React, { useEffect, useState } from 'react';
import { MilestoneTracker } from '@/features/pilot-dashboard/components/milestone-tracker';
import type { Milestone } from '@/features/pilot-dashboard/types';

export default function PilotDashboardPage({ params }: { params: { id: string } }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMilestones = async () => {
    // In a real app this would fetch from /api/proposals/[id]/milestones
    // For now we mock the data since we didn't build the specific GET milestones route
    setMilestones([
      { id: "m1", proposalId: params.id, title: "Initial Sign-off", description: "Sign the pilot agreement.", paymentInr: 100000, status: "approved" },
      { id: "m2", proposalId: params.id, title: "Deployment", description: "Deploy software to staging servers.", paymentInr: 200000, status: "pending" }
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchMilestones(); }, [params.id]);

  if (loading) return <div className="p-8">Loading pilot dashboard...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Active Pilot Tracker</h1>
      <MilestoneTracker milestones={milestones} onUpdate={fetchMilestones} />
    </div>
  );
}
