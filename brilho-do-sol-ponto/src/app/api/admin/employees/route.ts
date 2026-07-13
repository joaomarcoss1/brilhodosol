import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { normalizeMoney } from "@/lib/calculations";
import { writeAuditLog } from "@/lib/server/audit";
import { canAccessBranch, scopeByBranch, canViewFinancialData, maskSensitiveEmployeeFields, financialFieldsInPayload } from "@/lib/server/branch-permissions";
import { fail, ok, readJson } from "@/lib/server/http";
import { hashPin } from "@/lib/server/pin";


function publicEmployee(employee: any) {
  if (!employee) return null;
  const { pin_hash: _pinHash, ...safe } = employee;
  return { ...safe, has_pin: Boolean(employee.pin_hash) };
}

function parseWorkDays(value: unknown) {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") return value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item));
  return [1, 2, 3, 4, 5, 6];
}

function employeePayload(body: any, includeFinancial = true) {
  const payload: Record<string, unknown> = {
    registration_code: body.registration_code ? String(body.registration_code).trim() : null,
    full_name: String(body.full_name || "").trim(),
    document: body.document ? String(body.document).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    role: String(body.role || "").trim(),
    sector: body.sector ? String(body.sector).trim() : null,
    branch_id: body.branch_id,
    employment_type: body.employment_type || "mensalista",
    active: body.active ?? true,
    admission_date: body.admission_date,
    expected_start_time: body.expected_start_time || "08:00",
    expected_end_time: body.expected_end_time || "17:00",
    expected_daily_minutes: Number(body.expected_daily_minutes || 480),
    expected_lunch_minutes: Number(body.expected_lunch_minutes || 60),
    expected_lunch_start_time: body.expected_lunch_start_time || null,
    expected_lunch_end_time: body.expected_lunch_end_time || null,
    work_days: parseWorkDays(body.work_days),
    allow_overtime: body.allow_overtime ?? true
  };
  if (includeFinancial) {
    payload.monthly_salary = normalizeMoney(body.monthly_salary);
    payload.daily_rate = body.daily_rate === "" || body.daily_rate === null || body.daily_rate === undefined ? null : normalizeMoney(body.daily_rate);
    payload.daily_rate_mode = body.daily_rate_mode || "automatic";
    payload.pix_key = body.pix_key ? String(body.pix_key).trim() : null;
    payload.bank_name = body.bank_name ? String(body.bank_name).trim() : null;
    payload.bank_agency = body.bank_agency ? String(body.bank_agency).trim() : null;
    payload.bank_account = body.bank_account ? String(body.bank_account).trim() : null;
    payload.bank_account_type = body.bank_account_type ? String(body.bank_account_type).trim() : null;
    payload.payment_day = body.payment_day === "" || body.payment_day === null || body.payment_day === undefined ? null : Number(body.payment_day);
  }
  return payload;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const branchId = request.nextUrl.searchParams.get("branchId");
  const status = request.nextUrl.searchParams.get("status");
  const role = request.nextUrl.searchParams.get("role");
  const paymentDay = request.nextUrl.searchParams.get("paymentDay");
  const q = request.nextUrl.searchParams.get("q");
  let query = auth.supabase.from("employees").select("*, branches:branches!employees_branch_id_fkey(name), employee_salary_history(*)").order("full_name", { ascending: true });
  query = scopeByBranch(query, auth.context, "branch_id");
  if (branchId) {
    if (!canAccessBranch(auth.context, branchId)) return fail("Você não tem acesso a esta filial.", 403);
    query = query.eq("branch_id", branchId);
  }
  if (status === "active") query = query.eq("active", true);
  if (status === "inactive") query = query.eq("active", false);
  if (role) query = query.ilike("role", `%${role}%`);
  if (paymentDay) query = query.eq("payment_day", Number(paymentDay));
  if (q) query = query.or(`full_name.ilike.%${q}%,registration_code.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return fail("Erro ao listar funcionários.", 500, error.message);
  const canFinancial = canViewFinancialData(auth.context);
  return ok({ employees: (data || []).map(publicEmployee).map((employee) => canFinancial ? employee : maskSensitiveEmployeeFields(employee, auth.context)) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const body = await readJson<any>(request);
    if (!body.pin || !/^\d{4}$/.test(String(body.pin))) return fail("PIN inicial obrigatório e deve conter exatamente 4 dígitos.", 400);
    const canFinancial = canViewFinancialData(auth.context);
    const financialKeys = financialFieldsInPayload(body);
    if (!canFinancial && financialKeys.length) return fail("Você não tem permissão para alterar dados financeiros.", 403);
    const payload: Record<string, unknown> = {
      ...employeePayload(body, canFinancial),
      pin_hash: await hashPin(String(body.pin))
    };
    if (!canAccessBranch(auth.context, String(payload.branch_id || ""))) return fail("Você não tem acesso a esta filial.", 403);
    if (!payload.full_name || !payload.role || !payload.branch_id || !payload.admission_date) {
      return fail("Preencha nome, cargo, filial e admissão.", 400);
    }

    const { data, error } = await auth.supabase.from("employees").insert(payload).select("*, branches:branches!employees_branch_id_fkey(name)").single();
    if (error) return fail("Erro ao criar funcionário.", 500, error.message);

    if (canFinancial) {
      await auth.supabase.from("employee_salary_history").insert({
        employee_id: data.id,
        monthly_salary: data.monthly_salary,
        daily_rate: data.daily_rate,
        daily_rate_mode: data.daily_rate_mode,
        effective_from: data.admission_date,
        valid_from: data.admission_date,
        reason: "Cadastro inicial",
        changed_by: auth.context.userId
      });
    }

    await auth.supabase.from("work_schedules").insert({
      employee_id: data.id,
      title: "Escala principal",
      work_days: data.work_days,
      expected_start_time: data.expected_start_time,
      expected_end_time: data.expected_end_time,
      expected_daily_minutes: data.expected_daily_minutes,
      expected_lunch_minutes: data.expected_lunch_minutes,
      expected_lunch_start_time: data.expected_lunch_start_time,
      expected_lunch_end_time: data.expected_lunch_end_time,
      effective_from: data.admission_date,
      active: true
    });

    await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "create", entity: "employees", entityId: data.id, newData: publicEmployee(data) });
    return ok({ employee: publicEmployee(data) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao criar funcionário.", 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const body = await readJson<any>(request);
    if (!body.id) return fail("ID do funcionário obrigatório.", 400);
    const { data: oldData, error: oldError } = await auth.supabase.from("employees").select("*").eq("id", body.id).maybeSingle();
    if (oldError || !oldData) return fail("Funcionário não encontrado.", 404, oldError?.message);

    const canFinancial = canViewFinancialData(auth.context);
    const financialKeys = financialFieldsInPayload(body);
    if (!canFinancial && financialKeys.length) return fail("Você não tem permissão para alterar dados financeiros.", 403);
    const payload: Record<string, unknown> = employeePayload(body, canFinancial);
    if (!canAccessBranch(auth.context, oldData.branch_id)) return fail("Você não tem acesso a este funcionário.", 403);
    if (!canAccessBranch(auth.context, String(payload.branch_id || oldData.branch_id))) return fail("Você não tem acesso à filial selecionada.", 403);
    if (body.pin) payload.pin_hash = await hashPin(String(body.pin));

    const { data, error } = await auth.supabase.from("employees").update(payload).eq("id", body.id).select("*, branches:branches!employees_branch_id_fkey(name)").single();
    if (error) return fail("Erro ao atualizar funcionário.", 500, error.message);

    if (canFinancial && (
      Number(oldData.monthly_salary) !== Number(data.monthly_salary) ||
      Number(oldData.daily_rate || 0) !== Number(data.daily_rate || 0) ||
      oldData.daily_rate_mode !== data.daily_rate_mode
    )) {
      const validFrom = body.salary_valid_from || new Date().toISOString().slice(0, 10);
      const previousUntil = new Date(`${validFrom}T12:00:00Z`);
      previousUntil.setUTCDate(previousUntil.getUTCDate() - 1);
      const previousUntilKey = previousUntil.toISOString().slice(0, 10);
      await auth.supabase
        .from("employee_salary_history")
        .update({ valid_until: previousUntilKey })
        .eq("employee_id", data.id)
        .is("valid_until", null);
      await auth.supabase.from("employee_salary_history").insert({
        employee_id: data.id,
        monthly_salary: data.monthly_salary,
        daily_rate: data.daily_rate,
        daily_rate_mode: data.daily_rate_mode,
        effective_from: validFrom,
        valid_from: validFrom,
        reason: body.salary_change_reason || "Alteração salarial administrativa",
        changed_by: auth.context.userId
      });
    }

    await writeAuditLog({
      supabase: auth.supabase,
      context: auth.context,
      action: "update",
      entity: "employees",
      entityId: data.id,
      oldData: publicEmployee(oldData),
      newData: publicEmployee(data)
    });
    return ok({ employee: publicEmployee(data) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar funcionário.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return fail("ID do funcionário obrigatório.", 400);
  const { data: oldData } = await auth.supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (oldData && !canAccessBranch(auth.context, oldData.branch_id)) return fail("Você não tem acesso a esta filial.", 403);
  const { data, error } = await auth.supabase.from("employees").update({ active: false }).eq("id", id).select("*").single();
  if (error) return fail("Erro ao desativar funcionário.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "deactivate", entity: "employees", entityId: id, oldData: publicEmployee(oldData), newData: publicEmployee(data) });
  return ok({ employee: publicEmployee(data) });
}
