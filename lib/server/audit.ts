import { createClient } from "@/lib/supabase/server";

export async function writeAuditLog(
  actorId: string,
  actorRole: string,
  entityType: 'challenge' | 'proposal' | 'milestone' | 'document',
  entityId: string,
  action: string,
  oldValue?: unknown,
  newValue?: unknown
) {
  const supabase = await createClient();
  
  const { error } = await supabase.from('audit_log').insert({
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: entityType,
    entity_id: entityId,
    action: action,
    old_value: oldValue,
    new_value: newValue
  });

  if (error) {
    // We log but do not throw, so business operations don't fail if the audit log has a hiccup
    console.error("Failed to write audit log:", error);
  }
}
