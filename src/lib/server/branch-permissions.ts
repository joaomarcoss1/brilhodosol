import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminContext } from "@/lib/server/auth";
import { fail } from "@/lib/server/http";

const ALL_BRANCH_ROLES = new Set(["master_admin", "admin", "admin_geral", "rh_financeiro"]);
const FINANCIAL_ROLES = new Set(["master_admin", "rh_financeiro"]);
const BRANCH_MANAGEMENT_ROLES = new Set(["master_admin", "admin", "admin_geral"]);
const PAYROLL_ROLES = new Set(["master_admin", "rh_financeiro"]);

export function canAccessAllBranches(context: AdminContext) {
  return ALL_BRANCH_ROLES.has(context.role) && (!context.allowedBranchIds || context.allowedBranchIds.length === 0) && !context.branchId;
}

export function canViewFinancialData(context: AdminContext) {
  return FINANCIAL_ROLES.has(context.role) || Boolean(context.canViewFinancialData);
}

export function canManagePayroll(context: AdminContext) {
  return PAYROLL_ROLES.has(context.role) || Boolean(context.canViewFinancialData);
}

export function canManageBranches(context: AdminContext) {
  return BRANCH_MANAGEMENT_ROLES.has(context.role);
}

export function canManageAdmins(context: AdminContext) {
  return context.role === "master_admin";
}

export function allowedBranchIds(context: AdminContext) {
  if (canAccessAllBranches(context)) return null;
  const ids = new Set<string>();
  if (context.branchId) ids.add(context.branchId);
  (context.allowedBranchIds || []).forEach((id) => id && ids.add(id));
  return [...ids];
}

export function canAccessBranch(context: AdminContext, branchId?: string | null) {
  if (!branchId) return canAccessAllBranches(context);
  const ids = allowedBranchIds(context);
  return ids === null || ids.includes(branchId);
}

export function assertCanAccessBranch(context: AdminContext, branchId?: string | null) {
  if (!canAccessBranch(context, branchId)) {
    return fail("Você não tem acesso a esta filial.", 403);
  }
  return null;
}

export function assertCanViewFinancial(context: AdminContext) {
  if (!canViewFinancialData(context)) {
    return fail("Você não tem permissão para acessar dados financeiros.", 403);
  }
  return null;
}

export function scopeByBranch(query: any, context: AdminContext, column = "branch_id") {
  const ids = allowedBranchIds(context);
  if (ids === null) return query;
  if (!ids.length) return query.eq(column, "00000000-0000-0000-0000-000000000000");
  return query.in(column, ids);
}

export function scopeNullableBranchQuery(query: any, context: AdminContext, column = "branch_id") {
  const ids = allowedBranchIds(context);
  if (ids === null) return query;
  if (!ids.length) return query.eq(column, "00000000-0000-0000-0000-000000000000");
  return query.in(column, ids);
}

export function scopeRowsByBranch<T extends Record<string, any>>(rows: T[], context: AdminContext, key = "branch_id") {
  const ids = allowedBranchIds(context);
  if (ids === null) return rows;
  return rows.filter((row) => ids.includes(String(row[key] || "")));
}

export async function assertEmployeeInScope(params: { supabase: SupabaseClient; context: AdminContext; employeeId: string }) {
  const { data, error } = await params.supabase.from("employees").select("id, branch_id").eq("id", params.employeeId).maybeSingle();
  if (error) return fail("Erro ao validar funcionário.", 500, error.message);
  if (!data) return fail("Funcionário não encontrado.", 404);
  if (!canAccessBranch(params.context, data.branch_id)) return fail("Você não tem acesso a este funcionário.", 403);
  return null;
}

export function getAllowedBranchIds(context: AdminContext) {
  return allowedBranchIds(context);
}

export function requireFinancialPermission(context: AdminContext) {
  return assertCanViewFinancial(context);
}

export function requireMasterAdminContext(context: AdminContext) {
  if (context.role !== "master_admin") return fail("Ação exclusiva do administrador master.", 403);
  return null;
}

export async function assertPayrollInScope(params: { supabase: SupabaseClient; context: AdminContext; payrollId: string }) {
  const { data, error } = await params.supabase.from("payroll_periods").select("id, branch_id").eq("id", params.payrollId).maybeSingle();
  if (error) return fail("Erro ao validar folha.", 500, error.message);
  if (!data) return fail("Folha não encontrada.", 404);
  if (!canAccessBranch(params.context, data.branch_id)) return fail("Você não tem acesso a esta folha.", 403);
  return null;
}

export function maskSensitiveEmployeeFields<T extends Record<string, any>>(employee: T, context: AdminContext): T {
  const safe: Record<string, any> = { ...employee };
  delete safe.pin_hash;
  delete safe.pin;
  if (!canViewFinancialData(context)) {
    safe.monthly_salary = null;
    safe.daily_rate = null;
    safe.pix_key = null;
    safe.bank_name = null;
    safe.bank_agency = null;
    safe.bank_account = null;
    safe.bank_account_type = null;
    if (Array.isArray(safe.employee_salary_history)) safe.employee_salary_history = [];
  }
  return safe as T;
}

export function maskSensitiveRows<T extends Record<string, any>>(rows: T[], context: AdminContext) {
  return rows.map((row) => maskSensitiveEmployeeFields(row, context));
}
