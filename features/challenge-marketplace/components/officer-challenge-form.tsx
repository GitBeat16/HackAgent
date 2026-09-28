"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Building2, Calendar, IndianRupee, LayoutTemplate } from "lucide-react";

export function OfficerChallengeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    domain: "",
    budgetInr: "",
    deadline: "",
  });

  const [datasetFile, setDatasetFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('domain', formData.domain);
      if (formData.budgetInr) data.append('budgetInr', formData.budgetInr);
      if (formData.deadline) data.append('deadline', formData.deadline);
      if (datasetFile) data.append('datasetFile', datasetFile);

      const res = await fetch('/api/challenges', {
        method: 'POST',
        body: data
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create challenge");
      
      router.push('/dashboard');
    } catch (error: unknown) {
      alert("Failed to create challenge: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg bg-surface/50 backdrop-blur-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="w-6 h-6 text-primary" />
            Problem Statement Details
          </CardTitle>
          <CardDescription>
            Define the outcome you want to achieve. Startups will bid with technical solutions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Challenge Title</Label>
            <Input 
              id="title" 
              placeholder="e.g. AI-driven Traffic Congestion Management" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Outcome Description</Label>
            <Textarea 
              id="description" 
              placeholder="Describe the problem, the current bottlenecks, and the desired metrics of success..." 
              required
              rows={5}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="bg-background/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="domain" className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                Domain / Sector
              </Label>
              <Input 
                id="domain" 
                placeholder="e.g. Transport, Healthcare, FinTech" 
                required
                value={formData.domain}
                onChange={e => setFormData({...formData, domain: e.target.value})}
                className="bg-background/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                Pilot Budget (INR) - Optional
              </Label>
              <Input 
                id="budget" 
                type="number"
                placeholder="e.g. 5000000" 
                value={formData.budgetInr}
                onChange={e => setFormData({...formData, budgetInr: e.target.value})}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Submission Deadline
              </Label>
              <Input 
                id="deadline" 
                type="date"
                required
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
                className="bg-background/50 block"
              />
            </div>
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="dataset" className="flex items-center gap-2">
                Dataset / Context File (Optional)
              </Label>
              <Input 
                id="dataset" 
                type="file"
                onChange={e => setDatasetFile(e.target.files?.[0] || null)}
                className="bg-background/50 block file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary/10 file:text-primary"
              />
              <p className="text-xs text-muted-foreground">Upload a CSV or PDF dataset to help formulate this challenge for startups.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t pt-6 flex justify-end">
          <Button type="button" variant="ghost" className="mr-3" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading} className="px-8">
            {loading ? "Publishing..." : "Publish Challenge"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

