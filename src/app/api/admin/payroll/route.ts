import { NextRequest } from "next/server";
import { calculatePayrollItemWithEngines } from "@/lib/services/payroll-engine";
import { fetchScheduleContext } from "@/lib/services/schedule-engine";
import { requireAdmin } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok, readJson } from "@/lib/server/http";
import { canAccessAllBranches, canAccessBranch, canViewFinancialData, scopeByBranch } from "@/lib/server/branch-permissions";
import { getSystemSettings } from "@/lib/server/settings";
import { buildPayrollClosureChecklist } from "@/lib/services/payroll-checklist";


function resolveSalarySnapshot(employee: any, history: any[], startDate: string, endDate: string) {
  const candidates = history
    .filter((item) => item.employee_id === employee.id)
    .filter((item) => {
      const validFrom = item.valid_from || item.effective_from || employee.admission_date;
      const validUntil = item.valid_until || "9999-12-31";
      return validFrom <= endDate && validUntil >= startDate;
    })
    .sort((a, b) => String(b.valid_from || b.effective_from).localeCompare(String(a.valid_from || a.effective_from)));

  const selected = candidates[0];
  if (!selected) {
    return {
      employee,
      salaryHistory: null,
      snapshot: {
        source: "current_employee_record",
        monthly_salary: employee.monthly_salary,
        daily_rate: employee.daily_rate,
        daily_rate_mode: employee.daily_rate_mode
      }
    };
  }

  const employeeWithHistoricalSalary = {
    ...employee,
    monthly_salary: Number(selected.monthly_salary || 0),
    daily_rate: selected.daily_rate === null || selected.daily_rate === undefined ? null : Number(selected.daily_rate),
    daily_rate_mode: selected.daily_rate_mode
  };

  return {
    employee: employeeWithHistoricalSalary,
    salaryHistory: selected,
    snapshot: {
      source: "employee_salary_history",
      salary_history_id: selected.id,
      monthly_salary: selected.monthly_salary,
      daily_rate: selected.daily_rate,
      daily_rate_mode: selected.daily_rate_mode,
      valid_from: selected.valid_from || selected.effective_from,
      valid_until: selected.valid_until
    }
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  if (!canViewFinancialData(auth.context)) return fail("Você não tem permissão para acessar folha de pagamento.", 403);
  const id = request.nextUrl.searchParams.get("id");
  const branchId = request.nextUrl.searchParams.get("branchId");
  const paymentDay = request.nextUrl.searchParams.get("paymentDay");
  const status = request.nextUrl.searchParams.get("status");
  let periodsQuery = auth.supabase.from("payroll_periods").select("*, branches:branches!payroll_periods_branch_id_fkey(name)").order("created_at", { ascending: false }).limit(200);
  if (id) periodsQuery = periodsQuery.eq("id", id);
  periodsQuery = scopeByBranch(periodsQuery, auth.context, "branch_id");
  if (branchId) {
    if (!canAccessBranch(auth.context, branchId)) return fail("Você não tem acesso a esta filial.", 403);
    periodsQuery = periodsQuery.eq("branch_id", branchId);
  }
  if (paymentDay) periodsQuery = periodsQuery.eq("payment_day", Number(paymentDay));
  if (status) periodsQuery = periodsQuery.eq("status", status);
  const { data: periods, error } = await periodsQuery;
  if (error) return fail("Erro ao listar folhas.", 500, error.message);

  let items: any[] = [];
  if (id) {
    const itemQuery = scopeByBranch(auth.supabase
      .from("payroll_items")
      .select("*")
      .eq("payroll_period_id", id), auth.context, "branch_id")
      .order("employee_name", { ascending: true });
    const { data: itemData, error: itemError } = await itemQuery;
    if (itemError) return fail("Erro ao listar itens da folha.", 500, itemError.message);
    items = itemData || [];
  }
  return ok({ periods: periods || [], items });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  if (!canViewFinancialData(auth.context)) return fail("Você não tem permissão para acessar folha de pagamento.", 403);
  try {
    const body = await readJson<any>(request);
    if (!body.title || !body.start_date || !body.end_date) return fail("Informe título e período da folha.", 400);
    if (body.branch_id && !canAccessBranch(auth.context, body.branch_id)) return fail("Você não tem acesso a esta filial.", 403);
    if (!body.branch_id && !canAccessAllBranches(auth.context)) return fail("Selecione uma filial permitida para gerar a folha.", 403);

    const { data: period, error: periodError } = await auth.supabase
      .from("payroll_periods")
      .insert({
        title: body.title,
        period_type: body.period_type || "monthly",
        start_date: body.start_date,
        end_date: body.end_date,
        branch_id: body.branch_id || null,
        status: "draft",
        payment_day: body.payment_day ? Number(body.payment_day) : null,
        created_by: auth.context.userId,
        notes: body.notes || null
      })
      .select("*")
      .single();

    if (periodError) return fail("Erro ao criar período de folha.", 500, periodError.message);

    let employeesQuery = scopeByBranch(auth.supabase.from("employees").select("*, branches:branches!employees_branch_id_fkey(name)").eq("active", true).order("full_name"), auth.context, "branch_id");
    if (body.branch_id) employeesQuery = employeesQuery.eq("branch_id", body.branch_id);
    if (body.employee_id) employeesQuery = employeesQuery.eq("id", body.employee_id);
    if (body.role) employeesQuery = employeesQuery.ilike("role", `%${body.role}%`);
    if (body.employment_type) employeesQuery = employeesQuery.eq("employment_type", body.employment_type);
    if (body.payment_day) employeesQuery = employeesQuery.eq("payment_day", Number(body.payment_day));
    const [{ data: employees, error: employeesError }, { data: entries, error: entriesError }, { data: justifications, error: justificationsError }] =
      await Promise.all([
        employeesQuery,
        scopeByBranch(auth.supabase.from("time_entries").select("*").gte("entry_date", body.start_date).lte("entry_date", body.end_date), auth.context, "branch_id"),
        scopeByBranch(auth.supabase.from("absence_justifications").select("*").gte("absence_date", body.start_date).lte("absence_date", body.end_date), auth.context, "branch_id")
      ]);

    if (employeesError) throw new Error(employeesError.message);
    if (entriesError) throw new Error(entriesError.message);
    if (justificationsError) throw new Error(justificationsError.message);

    const employeeIds = (employees || []).map((employee: any) => employee.id);
    const { data: salaryHistory, error: salaryHistoryError } = await auth.supabase
      .from("employee_salary_history")
      .select("*")
      .in("employee_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"])
      .lte("valid_from", body.end_date)
      .or(`valid_until.is.null,valid_until.gte.${body.start_date}`);
    if (salaryHistoryError) throw new Error(salaryHistoryError.message);

    const settings = await getSystemSettings(auth.supabase);
    const branchIds = [...new Set((employees || []).map((employee: any) => employee.branch_id))] as string[];
    const { schedules, holidays } = await fetchScheduleContext({
      supabase: auth.supabase,
      employeeIds,
      branchIds,
      startDate: body.start_date,
      endDate: body.end_date
    });
    const { data: overtimeReviews, error: overtimeError } = await auth.supabase
      .from("overtime_reviews")
      .select("*")
      .in("employee_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("entry_date", body.start_date)
      .lte("entry_date", body.end_date);
    if (overtimeError) throw new Error(overtimeError.message);

    const items = (employees || []).map((employee: any) => {
      const salary = resolveSalarySnapshot(employee, salaryHistory || [], body.start_date, body.end_date);
      const calculation = calculatePayrollItemWithEngines({
        employee: salary.employee,
        entries: (entries || []).filter((entry: any) => entry.employee_id === salary.employee.id),
        justifications: (justifications || []).filter((justification: any) => justification.employee_id === salary.employee.id) as any,
        holidays: holidays as any,
        schedules,
        overtimeReviews: (overtimeReviews || []).filter((review: any) => review.employee_id === salary.employee.id),
        settings,
        startDate: body.start_date,
        endDate: body.end_date,
        periodType: body.period_type || "monthly"
      });
      return {
        payroll_period_id: period.id,
        employee_id: employee.id,
        branch_id: employee.branch_id,
        employee_name: employee.full_name,
        branch_name: employee.branches?.name || "",
        role: employee.role,
        employment_type: employee.employment_type,
        pix_key: employee.pix_key,
        bank_name: employee.bank_name,
        bank_agency: employee.bank_agency,
        bank_account: employee.bank_account,
        bank_account_type: employee.bank_account_type,
        period_status_snapshot: period.status,
        ...calculation,
        calculation_snapshot: {
          employee: {
            id: employee.id,
            full_name: employee.full_name,
            branch_id: employee.branch_id,
            employment_type: employee.employment_type,
            monthly_salary: salary.employee.monthly_salary,
            daily_rate: salary.employee.daily_rate,
            daily_rate_mode: salary.employee.daily_rate_mode,
            expected_daily_minutes: employee.expected_daily_minutes,
            work_days: employee.work_days,
            payment_day: employee.payment_day || null,
            salary_snapshot: salary.snapshot
          },
          settings,
          generated_at: new Date().toISOString()
        }
      };
    });

    if (items.length > 0) {
      const { error: itemsError } = await auth.supabase.from("payroll_items").insert(items);
      if (itemsError) throw new Error(itemsError.message);
    }

    await writeAuditLog({
      supabase: auth.supabase,
      context: auth.context,
      action: "generate",
      entity: "payroll_periods",
      entityId: period.id,
      newData: { period, items: items.length }
    });
    return ok({ period, itemsCreated: items.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao gerar folha.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  if (!canViewFinancialData(auth.context)) return fail("Você não tem permissão para acessar folha de pagamento.", 403);
  const body = await readJson<any>(request);
  if (!body.id || !body.status) return fail("Informe período e status.", 400);
  const { data: oldData } = await auth.supabase.from("payroll_periods").select("*").eq("id", body.id).maybeSingle();
  if (!oldData) return fail("Folha não encontrada.", 404);
  if (oldData.branch_id && !canAccessBranch(auth.context, oldData.branch_id)) return fail("Você não tem acesso a esta folha.", 403);
  if (["closed", "closed_with_exceptions", "paid"].includes(oldData.status) && body.status !== "reopened" && body.status !== oldData.status) {
    return fail("Folha fechada, fechada com exceção ou paga não pode ter status alterado. Reabertura somente por admin master com justificativa.", 409);
  }
  if (body.status === "reopened" && auth.context.role !== "master_admin") {
    return fail("Somente admin master pode reabrir folha fechada.", 403);
  }
  if (body.status === "reopened" && !String(body.reason || "").trim()) {
    return fail("Informe o motivo da reabertura da folha.", 400);
  }
  const payload: Record<string, unknown> = {
    status: body.status,
    notes: body.notes ?? oldData?.notes ?? null
  };
  if (body.status === "closed") {
    const checklist = await buildPayrollClosureChecklist(auth.supabase, body.id);
    await auth.supabase.from("payroll_closure_checks").delete().eq("payroll_period_id", body.id);
    await auth.supabase.from("payroll_closure_checks").insert(checklist.checks.map((item) => ({ payroll_period_id: body.id, ...item })));
    const overrideReason = String(body.overrideReason || "").trim();
    if (checklist.hasCritical && auth.context.role !== "master_admin") {
      return ok({
        requiresClosureReview: true,
        checklist: checklist.checks,
        summary: checklist.summary,
        message: "A folha possui pendências críticas. Somente o admin master pode fechar com exceção formal."
      });
    }
    if (checklist.hasCritical && auth.context.role === "master_admin" && overrideReason.length < 12) {
      return ok({
        requiresClosureReview: true,
        allowMasterOverride: true,
        checklist: checklist.checks,
        summary: checklist.summary,
        message: "A folha possui pendências críticas. Informe uma justificativa formal para fechar com exceção."
      });
    }
    payload.status = checklist.hasCritical ? "closed_with_exceptions" : "closed";
    payload.closed_at = new Date().toISOString();
    payload.closure_checklist = checklist.checks;
    payload.closure_snapshot = { ...checklist.summary, closed_by: auth.context.email, closed_at: payload.closed_at, forced_by_master: checklist.hasCritical };
    payload.closure_override_reason = overrideReason || null;
  }
  if (body.status === "reopened") {
    payload.reopened_at = new Date().toISOString();
    payload.reopened_reason = body.reason;
  }
  const { data, error } = await auth.supabase.from("payroll_periods").update(payload).eq("id", body.id).select("*").single();
  if (error) return fail("Erro ao atualizar status da folha.", 500, error.message);
  await writeAuditLog({
    supabase: auth.supabase,
    context: auth.context,
    action: `payroll_${body.status}`,
    entity: "payroll_periods",
    entityId: data.id,
    oldData,
    newData: data
  });
  return ok({ period: data });
}
