"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";

export function SubmitProposalForm({ challengeId, submitAction }: { challengeId: string, submitAction: (text: string) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [solutionType, setSolutionType] = useState<"App Generation" | "Service Proposal">("App Generation");
  const [architecture, setArchitecture] = useState("");
  const [timeline, setTimeline] = useState("");
  const [cost, setCost] = useState("");
  const [pastExperience, setPastExperience] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const compiledText = `[Solution Type]: ${solutionType}\n\n[Architecture & Approach]:\n${architecture}\n\n[Implementation Timeline]:\n${timeline}\n\n[Estimated Cost]: ₹${cost}\n\n[Past Experience]:\n${pastExperience}`;

    try {
      if (compiledText.length < 200) {
        throw new Error("Proposal must be at least 200 characters overall.");
      }
      
      // Simple prompt injection sanitization
      let sanitized = compiledText.replace(/<\/system>/gi, '').replace(/\[INST\]/gi, '').replace(/<\|im_start\|>/gi, '');
      if (sanitized.length > 5000) sanitized = sanitized.substring(0, 5000);

      await submitAction(sanitized);
      router.refresh();
    } catch (err: unknown) {
      toast.error(String((err as Record<string, unknown>).message) || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Solution Type</Label>
        <Select 
          value={solutionType} 
          onChange={(e) => setSolutionType(e.target.value as "App Generation" | "Service Proposal")}
          options={[
            { label: "Software / App Generation", value: "App Generation" },
            { label: "Hardware / Service Proposal", value: "Service Proposal" }
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label>Architecture & Technical Approach</Label>
        <Textarea required value={architecture} onChange={e => setArchitecture(e.target.value)} placeholder="Describe how your solution solves the problem statement..." rows={4} />
      </div>

      <div className="space-y-2">
        <Label>Implementation Timeline (Weeks)</Label>
        <Input required type="number" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g., 12" />
      </div>

      <div className="space-y-2">
        <Label>Estimated Pilot Cost (INR)</Label>
        <Input required type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="500000" />
      </div>

      <div className="space-y-2">
        <Label>Relevant Past Experience</Label>
        <Textarea required value={pastExperience} onChange={e => setPastExperience(e.target.value)} placeholder="Links to similar projects, GitHub repos, or previous government pilots..." rows={3} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Submit Proposal to Government Panel"}
      </Button>
    </form>
  );
}
