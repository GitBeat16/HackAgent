import { createClient } from "@/lib/supabase/server";

export async function writeAuditLog(
  actorId: string,
  actorRole: string,
  entityType: string,
  entityId: string,
  action: string,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // In a real environment, you'd extract IP from headers()
    const ipAddress = null;

    const { error } = await supabase.from("audit_log").insert({
      actor_id: actorId,
      actor_role: actorRole,
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      ip_address: ipAddress,
    });

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (error) {
    console.error("Failed to write audit log (exception):", error);
  }
}
