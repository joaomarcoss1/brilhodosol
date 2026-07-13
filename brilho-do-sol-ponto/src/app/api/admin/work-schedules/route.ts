import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok, readJson } from "@/lib/server/http";
import { assertEmployeeInScope, scopeByBranch, canAccessBranch } from "@/lib/server/branch-permissions";


function parseWorkDays(value: unknown) {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") return value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item));
  return [1, 2, 3, 4, 5, 6];
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  let query = scopeByBranch(auth.supabase.from("work_schedules").select("*, employees(full_name, branch_id), branches:branches!work_schedules_branch_id_fkey(name)").order("created_at", { ascending: false }), auth.context, "branch_id");
  if (employeeId) {
    const scopeError = await assertEmployeeInScope({ supabase: auth.supabase, context: auth.context, employeeId });
    if (scopeError) return scopeError;
    query = query.eq("employee_id", employeeId);
  }
  const { data, error } = await query;
  if (error) return fail("Erro ao listar escalas.", 500, error.message);
  return ok({ schedules: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  const payload = {
    employee_id: body.employee_id,
    branch_id: body.branch_id || null,
    title: body.title || "Escala",
    work_days: parseWorkDays(body.work_days),
    weekday: body.weekday === "" || body.weekday === undefined ? null : Number(body.weekday),
    specific_date: body.specific_date || null,
    expected_start_time: body.expected_start_time,
    expected_end_time: body.expected_end_time,
    expected_daily_minutes: Number(body.expected_daily_minutes || 480),
    expected_lunch_minutes: Number(body.expected_lunch_minutes || 60),
    expected_lunch_start_time: body.expected_lunch_start_time || null,
    expected_lunch_end_time: body.expected_lunch_end_time || null,
    effective_from: body.effective_from,
    effective_until: body.effective_until || null,
    priority: Number(body.priority || 10),
    notes: body.notes || null,
    active: body.active ?? true
  };
  if (!payload.employee_id || !payload.effective_from || !payload.expected_start_time || !payload.expected_end_time) {
    return fail("Preencha funcionário, vigência e horários.", 400);
  }
  const scopeError = await assertEmployeeInScope({ supabase: auth.supabase, context: auth.context, employeeId: payload.employee_id });
  if (scopeError) return scopeError;
  if (payload.branch_id && !canAccessBranch(auth.context, payload.branch_id)) return fail("Você não tem acesso à filial da escala.", 403);
  const { data, error } = await auth.supabase.from("work_schedules").insert(payload).select("*").single();
  if (error) return fail("Erro ao criar escala.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "create", entity: "work_schedules", entityId: data.id, newData: data });
  return ok({ schedule: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.id) return fail("ID obrigatório.", 400);
  const { data: oldData } = await auth.supabase.from("work_schedules").select("*").eq("id", body.id).maybeSingle();
  const payload = {
    employee_id: body.employee_id,
    branch_id: body.branch_id || null,
    title: body.title || "Escala",
    work_days: parseWorkDays(body.work_days),
    weekday: body.weekday === "" || body.weekday === undefined ? null : Number(body.weekday),
    specific_date: body.specific_date || null,
    expected_start_time: body.expected_start_time,
    expected_end_time: body.expected_end_time,
    expected_daily_minutes: Number(body.expected_daily_minutes || 480),
    expected_lunch_minutes: Number(body.expected_lunch_minutes || 60),
    expected_lunch_start_time: body.expected_lunch_start_time || null,
    expected_lunch_end_time: body.expected_lunch_end_time || null,
    effective_from: body.effective_from,
    effective_until: body.effective_until || null,
    priority: Number(body.priority || 10),
    notes: body.notes || null,
    active: body.active ?? true
  };
  if (oldData?.branch_id && !canAccessBranch(auth.context, oldData.branch_id)) return fail("Você não tem acesso a esta escala.", 403);
  const scopeError = await assertEmployeeInScope({ supabase: auth.supabase, context: auth.context, employeeId: payload.employee_id });
  if (scopeError) return scopeError;
  if (payload.branch_id && !canAccessBranch(auth.context, payload.branch_id)) return fail("Você não tem acesso à filial da escala.", 403);
  const { data, error } = await auth.supabase.from("work_schedules").update(payload).eq("id", body.id).select("*").single();
  if (error) return fail("Erro ao atualizar escala.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "update", entity: "work_schedules", entityId: data.id, oldData, newData: data });
  return ok({ schedule: data });
}
