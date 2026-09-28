"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MilestoneClient({ milestone, isStartup }: { milestone: { id: string, title: string, description: string, payment_inr: number, status: string }, isStartup: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentTitle', 'Evidence for ' + milestone.title);
      
      const res = await fetch(`/api/milestones/${milestone.id}/evidence`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      window.location.reload();
    } catch (err: unknown) {
      toast.error("Error: " + String((err as Record<string, unknown>).message));
    } finally {
      setLoading(false);
    }
  };

  if (isStartup && (milestone.status === 'pending' || milestone.status === 'rejected')) {
    return (
      <div className="pt-2 border-t flex items-center justify-between">
        <span className="text-sm">Submit Evidence:</span>
        <input 
          type="file" 
          onChange={handleUpload} 
          disabled={loading}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>
    );
  }

  return null;
}
