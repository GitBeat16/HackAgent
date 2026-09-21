"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createChallenge } from "../service";

export function OfficerChallengeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "Citizens currently wait X days for Y. The desired outcome is Z, measurable by metric M.",
    domain: "technology" as any,
    budgetInr: "",
    deadline: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        domain: formData.domain,
        budgetInr: formData.budgetInr ? parseInt(formData.budgetInr) : undefined,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
      };
      
      await createChallenge(payload);
      router.push("/marketplace");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to create challenge.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium mb-1">Challenge Title</label>
        <Input 
          required 
          minLength={10} 
          value={formData.title} 
          onChange={e => setFormData({ ...formData, title: e.target.value })} 
          placeholder="e.g. Automated pothole detection using mobile crowdsourcing" 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Outcome-Based Description</label>
        <Textarea 
          required 
          minLength={50} 
          rows={6}
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })} 
        />
        <p className="text-xs text-muted-foreground mt-1">Focus on the problem and metrics, not the required technology stack.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Domain</label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={formData.domain}
            onChange={e => setFormData({ ...formData, domain: e.target.value as any })}
          >
            <option value="technology">Technology</option>
            <option value="transport">Transport</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="agriculture">Agriculture</option>
            <option value="urban">Urban Planning</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Pilot Budget (INR) - Optional</label>
          <Input 
            type="number" 
            min={0}
            value={formData.budgetInr} 
            onChange={e => setFormData({ ...formData, budgetInr: e.target.value })} 
            placeholder="e.g. 500000" 
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Submission Deadline</label>
        <Input 
          type="date" 
          value={formData.deadline} 
          onChange={e => setFormData({ ...formData, deadline: e.target.value })} 
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Publishing..." : "Publish Challenge"}
      </Button>
    </form>
  );
}
