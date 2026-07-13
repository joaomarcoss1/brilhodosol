import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminContext } from "@/lib/server/auth";

export async function writeAuditLog(params: {
  supabase: SupabaseClient;
  context?: AdminContext;
  action: string;
  entity: string;
  entityId?: string | null;
  oldData?: unknown;
  newData?: unknown;
}) {
  const { supabase, context, action, entity, entityId, oldData, newData } = params;
  await supabase.from("audit_logs").insert({
    user_id: context?.userId || null,
    user_email: context?.email || "sistema",
    action,
    entity,
    entity_id: entityId || null,
    old_data: oldData ?? null,
    new_data: newData ?? null
  });
}
