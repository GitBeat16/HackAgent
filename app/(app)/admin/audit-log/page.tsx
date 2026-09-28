import { requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";

export default async function AuditLogPage() {
  const { user, response } = await requireRole("platform_admin");
  if (response || !user) redirect("/login");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*, profiles!actor_id(startup_name, department_name, role)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8">
      <SectionHeader title="Platform Audit Log" description="Immutable record of all procurement transitions and overrides." />

      <div className="border rounded-lg bg-surface/50 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log: { id: string, created_at: string, profiles?: { department_name?: string, startup_name?: string }, actor_role: string, entity_type: string, entity_id: string, action: string, old_value: unknown, new_value: unknown }) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{log.profiles?.department_name || log.profiles?.startup_name || 'System'}</div>
                  <Badge tone="outline" className="text-[10px] uppercase">{log.actor_role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize">{log.entity_type}</span><br/>
                  <span className="text-[10px] text-muted-foreground">{log.entity_id.split('-')[0]}...</span>
                </td>
                <td className="px-4 py-3 font-medium">{log.action}</td>
                <td className="px-4 py-3 text-xs max-w-xs truncate">
                  <span className="text-muted-foreground">From: </span> {JSON.stringify(log.old_value)}<br/>
                  <span className="text-muted-foreground">To: </span> {JSON.stringify(log.new_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
