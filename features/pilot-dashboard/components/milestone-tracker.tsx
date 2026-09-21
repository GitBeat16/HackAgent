"use client";

import React from "react";
import type { Milestone } from "../types";
import { EvidenceUpload } from "./evidence-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MilestoneTracker({ milestones, onUpdate }: { milestones: Milestone[]; onUpdate: () => void }) {
  if (!milestones || milestones.length === 0) {
    return <div className="text-muted-foreground p-8">No milestones defined yet.</div>;
  }

  return (
    <div className="space-y-4">
      {milestones.map((m) => (
        <Card key={m.id} className={m.status === "approved" ? "border-green-500/50 bg-green-500/5" : ""}>
          <CardHeader className="pb-2 flex flex-row justify-between items-center">
            <CardTitle className="text-lg">{m.title}</CardTitle>
            <Badge className={
              m.status === "approved" ? "bg-green-500 text-white" :
              m.status === "evidence_submitted" ? "bg-blue-500 text-white" :
              "bg-secondary"
            }>
              {m.status.replace("_", " ").toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{m.description}</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">₹{(m.paymentInr / 100000).toFixed(2)} Lakhs</span>
              
              {m.status === "pending" || m.status === "rejected" ? (
                <EvidenceUpload milestoneId={m.id} onUploaded={onUpdate} />
              ) : m.status === "evidence_submitted" ? (
                <span className="text-xs text-muted-foreground">Awaiting Officer Approval</span>
              ) : (
                <span className="text-xs font-bold text-green-600">Payment Approved</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
