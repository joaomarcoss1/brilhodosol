import { NextRequest } from "next/server";
import { hasClosedPayrollForDate } from "@/lib/server/closed-periods";
import { requireAdmin } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok, readJson } from "@/lib/server/http";
import { assertEmployeeInScope, canAccessBranch, scopeByBranch } from "@/lib/server/branch-permissions";


export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const params = request.nextUrl.searchParams;
  let query = scopeByBranch(auth.supabase
    .from("time_entries")
    .select("*, employees(full_name, role), branches:branches!time_entries_branch_id_fkey(name)")
    .order("entry_timestamp", { ascending: false })
    .limit(600), auth.context, "branch_id");
  if (params.get("branchId")) {
    if (!canAccessBranch(auth.context, params.get("branchId"))) return fail("Você não tem acesso a esta filial.", 403);
    query = query.eq("branch_id", params.get("branchId"));
  }
  if (params.get("employeeId")) {
    const employeeScopeError = await assertEmployeeInScope({ supabase: auth.supabase, context: auth.context, employeeId: params.get("employeeId") || "" });
    if (employeeScopeError) return employeeScopeError;
    query = query.eq("employee_id", params.get("employeeId"));
  }
  if (params.get("status")) query = query.eq("status", params.get("status"));
  if (params.get("action")) query = query.eq("action", params.get("action"));
  if (params.get("startDate")) query = query.gte("entry_date", params.get("startDate"));
  if (params.get("endDate")) query = query.lte("entry_date", params.get("endDate"));
  if (params.get("occurrenceType") === "late") query = query.gt("late_minutes", 0);
  if (params.get("occurrenceType") === "early_leave") query = query.gt("early_leave_minutes", 0);
  if (params.get("occurrenceType") === "outside_radius") query = query.eq("inside_allowed_radius", false);
  const { data, error } = await query;
  if (error) return fail("Erro ao listar pontos.", 500, error.message);
  return ok({ entries: data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.id) return fail("ID do ponto obrigatório.", 400);

  const { data: oldData, error: oldError } = await auth.supabase.from("time_entries").select("*").eq("id", body.id).maybeSingle();
  if (oldError || !oldData) return fail("Ponto não encontrado.", 404, oldError?.message);

  if (!canAccessBranch(auth.context, oldData.branch_id)) return fail("Você não tem acesso a este ponto.", 403);

  const closed = await hasClosedPayrollForDate({
    supabase: auth.supabase,
    employeeId: oldData.employee_id,
    branchId: oldData.branch_id,
    date: oldData.entry_date
  });
  if (closed) {
    return fail(`Este ponto pertence à folha fechada "${closed.title}". Reabra ou gere revisão antes de alterar.`, 409);
  }

  if (!body.adjustment_reason || String(body.adjustment_reason).trim().length < 5) {
    return fail("Todo ajuste manual exige um motivo claro.", 400);
  }

  const payload: Record<string, unknown> = {
    status: body.status || "adjusted",
    adjustment_reason: body.adjustment_reason || "Ajuste manual administrativo",
    adjusted_by: auth.context.userId,
    adjusted_at: new Date().toISOString()
  };
  if (body.entry_timestamp) payload.entry_timestamp = body.entry_timestamp;
  if (body.action) payload.action = body.action;
  if (body.late_minutes !== undefined) payload.late_minutes = Number(body.late_minutes);
  if (body.early_leave_minutes !== undefined) payload.early_leave_minutes = Number(body.early_leave_minutes);
  if (body.justification_text !== undefined) payload.justification_text = body.justification_text || null;
  if (body.review_flags) payload.review_flags = body.review_flags;

  const { id: _id, created_at: _createdAt, employees: _employees, branches: _branches, ...copy } = oldData;
  await auth.supabase
    .from("time_entries")
    .update({
      status: "canceled",
      occurrence_review_status: "cancelled",
      adjustment_reason: `Substituído por ajuste: ${body.adjustment_reason}`,
      adjusted_by: auth.context.userId,
      adjusted_at: new Date().toISOString()
    })
    .eq("id", body.id);

  const { data, error } = await auth.supabase
    .from("time_entries")
    .insert({
      ...copy,
      ...payload,
      original_entry_id: oldData.id,
      occurrence_review_status: body.status === "canceled" ? "cancelled" : "adjusted"
    })
    .select("*")
    .single();
  if (error) return fail("Erro ao ajustar ponto.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "manual_adjustment", entity: "time_entries", entityId: data.id, oldData, newData: data });
  return ok({ entry: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.employee_id || !body.branch_id || !body.action || !body.entry_timestamp || !body.adjustment_reason) {
    return fail("Preencha funcionário, filial, ação, data/hora e motivo.", 400);
  }
  const scopeError = await assertEmployeeInScope({ supabase: auth.supabase, context: auth.context, employeeId: body.employee_id });
  if (scopeError) return scopeError;
  if (!canAccessBranch(auth.context, body.branch_id)) return fail("Você não tem acesso à filial informada.", 403);
  const entryDate = String(body.entry_timestamp).slice(0, 10);
  const closed = await hasClosedPayrollForDate({
    supabase: auth.supabase,
    employeeId: body.employee_id,
    branchId: body.branch_id,
    date: entryDate
  });
  if (closed) return fail(`Este dia pertence à folha fechada "${closed.title}". Reabra antes de adicionar ponto.`, 409);

  const { data, error } = await auth.supabase
    .from("time_entries")
    .insert({
      employee_id: body.employee_id,
      branch_id: body.branch_id,
      action: body.action,
      entry_timestamp: body.entry_timestamp,
      entry_date: entryDate,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      distance_meters: body.distance_meters || null,
      inside_allowed_radius: body.inside_allowed_radius ?? true,
      late_minutes: Number(body.late_minutes || 0),
      early_leave_minutes: Number(body.early_leave_minutes || 0),
      required_justification: Boolean(body.required_justification),
      justification_text: body.justification_text || null,
      device_info: "ajuste administrativo",
      status: "adjusted",
      occurrence_review_status: "adjusted",
      review_flags: ["ponto_adicionado_manual"],
      adjusted_by: auth.context.userId,
      adjusted_at: new Date().toISOString(),
      adjustment_reason: body.adjustment_reason
    })
    .select("*")
    .single();
  if (error) return fail("Erro ao adicionar ponto manual.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "manual_create", entity: "time_entries", entityId: data.id, newData: data });
  return ok({ entry: data });
}
