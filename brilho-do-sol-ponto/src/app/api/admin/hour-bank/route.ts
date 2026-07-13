import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { assertCanAccessBranch, assertEmployeeInScope, scopeByBranch } from "@/lib/server/branch-permissions";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  let query = scopeByBranch(auth.supabase.from("hour_bank_movements").select("*, employees(full_name,registration_code), branches:branches!hour_bank_movements_branch_id_fkey(name)").order("movement_date", { ascending: false }).limit(1000), auth.context, "branch_id");
  const branchId = request.nextUrl.searchParams.get("branchId");
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  if (branchId) query = query.eq("branch_id", branchId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, error } = await query;
  if (error) return fail("Erro ao listar banco de horas.", 500, error.message);
  return ok({ movements: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  const employeeCheck = await assertEmployeeInScope({ supabase: auth.supabase, context: auth.context, employeeId: body.employee_id });
  if (employeeCheck) return employeeCheck;
  const branchCheck = assertCanAccessBranch(auth.context, body.branch_id);
  if (branchCheck) return branchCheck;
  const payload = {
    employee_id: body.employee_id,
    branch_id: body.branch_id,
    movement_date: body.movement_date || new Date().toISOString().slice(0, 10),
    minutes: Number(body.minutes || 0),
    movement_type: body.movement_type || "manual_adjustment",
    origin: body.origin || "manual",
    reason: body.reason || "Ajuste administrativo",
    created_by: auth.context.id
  };
  if (!payload.employee_id || !payload.branch_id || !payload.minutes) return fail("Funcionário, filial e minutos são obrigatórios.", 400);
  const { data, error } = await auth.supabase.from("hour_bank_movements").insert(payload).select("*").single();
  if (error) return fail("Erro ao registrar banco de horas.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "hour_bank_adjustment", entity: "hour_bank_movements", entityId: data.id, newData: data });
  return ok({ movement: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.id) return fail("ID obrigatório.", 400);
  const { data: oldData } = await auth.supabase.from("hour_bank_movements").select("*").eq("id", body.id).maybeSingle();
  if (!oldData) return fail("Movimento não encontrado.", 404);
  const branchCheck = assertCanAccessBranch(auth.context, oldData.branch_id);
  if (branchCheck) return branchCheck;
  const payload = { movement_date: body.movement_date, minutes: Number(body.minutes || 0), movement_type: body.movement_type, reason: body.reason };
  const { data, error } = await auth.supabase.from("hour_bank_movements").update(payload).eq("id", body.id).select("*").single();
  if (error) return fail("Erro ao atualizar banco de horas.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "update_hour_bank", entity: "hour_bank_movements", entityId: data.id, oldData, newData: data });
  return ok({ movement: data });
}
