"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveProposalWithMilestones } from "../service";
import { IndianRupee, Plus, Trash2 } from "lucide-react";

export function MilestoneModal({ proposalId, onComplete, onCancel }: { proposalId: string, onComplete: () => void, onCancel: () => void }) {
  const [milestones, setMilestones] = useState([{ title: "", description: "", paymentInr: "", dueDate: "" }]);
  const [pilotPlan, setPilotPlan] = useState({ durationWeeks: "", scopeDescription: "", constraints: "" });
  const [kpis, setKpis] = useState([{ name: "", unit: "", baseline: "", target: "" }]);
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedMilestones = milestones.map(m => ({
        title: m.title,
        description: m.description,
        paymentInr: parseInt(m.paymentInr) || 0,
        dueDate: m.dueDate || undefined
      }));
      const parsedPlan = {
        durationWeeks: parseInt(pilotPlan.durationWeeks) || 12,
        scopeDescription: pilotPlan.scopeDescription,
        constraints: pilotPlan.constraints,
        kpis: kpis.map(k => ({
          name: k.name,
          unit: k.unit,
          baseline: parseFloat(k.baseline) || 0,
          target: parseFloat(k.target) || 0
        }))
      };
      await approveProposalWithMilestones(proposalId, parsedMilestones, parsedPlan, overrideReason);
      onComplete();
    } catch (err: unknown) {
      toast.error("Failed to approve: " + String((err as Record<string, unknown>).message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">Pilot Design & Approval</h2>
        <p className="text-sm text-muted-foreground mb-6">Define the pilot plan, KPIs, and payment milestones.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">1. Pilot Plan</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Weeks)</Label>
                <Input required type="number" value={pilotPlan.durationWeeks} onChange={e => setPilotPlan({...pilotPlan, durationWeeks: e.target.value})} placeholder="12" />
              </div>
              <div className="space-y-2">
                <Label>Scope Description</Label>
                <Input required value={pilotPlan.scopeDescription} onChange={e => setPilotPlan({...pilotPlan, scopeDescription: e.target.value})} placeholder="Departments or districts involved" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Constraints / Data Needs</Label>
              <Textarea value={pilotPlan.constraints} onChange={e => setPilotPlan({...pilotPlan, constraints: e.target.value})} placeholder="Any specific requirements or data access needed..." />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">2. Success KPIs</h3>
            {kpis.map((k, i) => (
              <div key={i} className="flex gap-2 items-start relative">
                <div className="grid grid-cols-4 gap-2 flex-grow">
                  <div><Label className="text-xs">KPI Name</Label><Input required value={k.name} onChange={e => { const n = [...kpis]; n[i]!.name = e.target.value; setKpis(n); }} placeholder="Active Users" /></div>
                  <div><Label className="text-xs">Unit</Label><Input required value={k.unit} onChange={e => { const n = [...kpis]; n[i]!.unit = e.target.value; setKpis(n); }} placeholder="count" /></div>
                  <div><Label className="text-xs">Baseline</Label><Input required type="number" value={k.baseline} onChange={e => { const n = [...kpis]; n[i]!.baseline = e.target.value; setKpis(n); }} /></div>
                  <div><Label className="text-xs">Target</Label><Input required type="number" value={k.target} onChange={e => { const n = [...kpis]; n[i]!.target = e.target.value; setKpis(n); }} /></div>
                </div>
                {kpis.length > 1 && <Button type="button" variant="ghost" size="icon" className="mt-5 text-destructive" onClick={() => setKpis(kpis.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setKpis([...kpis, {name: '', unit: '', baseline: '', target: ''}])}><Plus className="w-4 h-4 mr-2" /> Add KPI</Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">3. Milestones</h3>
            {milestones.map((m, i) => (
              <div key={i} className="space-y-4 p-4 border rounded-lg bg-muted/20 relative">
                {milestones.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Milestone Title</Label>
                    <Input required value={m.title} onChange={e => { const n = [...milestones]; n[i]!.title = e.target.value; setMilestones(n); }} placeholder="e.g. Prototype Delivered" />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={m.dueDate} onChange={e => { const n = [...milestones]; n[i]!.dueDate = e.target.value; setMilestones(n); }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Acceptance Criteria</Label>
                    <Input required value={m.description} onChange={e => { const n = [...milestones]; n[i]!.description = e.target.value; setMilestones(n); }} placeholder="What must be demonstrated?" />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment (INR)</Label>
                    <Input required type="number" value={m.paymentInr} onChange={e => { const n = [...milestones]; n[i]!.paymentInr = e.target.value; setMilestones(n); }} placeholder="500000" />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setMilestones([...milestones, { title: "", description: "", paymentInr: "", dueDate: "" }])}><Plus className="w-4 h-4 mr-2" /> Add Milestone</Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">4. Final Decision</h3>
            <div className="space-y-2">
              <Label>Override Reason (Optional)</Label>
              <Textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="If you are disagreeing with the AI Panel's recommendation, state why here for the audit log..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Approve Pilot & Issue Contract"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
