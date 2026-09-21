import React from "react";
import type { ImpactMetrics } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ImpactOverview({ metrics }: { metrics: ImpactMetrics }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalChallenges}</div>
          <p className="text-xs text-muted-foreground">Posted by 12 Departments</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Proposals Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalProposals}</div>
          <p className="text-xs text-muted-foreground">From verified startups</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Pilots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activePilots}</div>
          <p className="text-xs text-muted-foreground">Currently deployed</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Deployed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{(metrics.totalBudgetDeployed / 10000000).toFixed(2)} Cr</div>
          <p className="text-xs text-muted-foreground">Through milestone payments</p>
        </CardContent>
      </Card>
    </div>
  );
}
