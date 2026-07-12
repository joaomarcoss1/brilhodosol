import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { canViewFinancialData, scopeByBranch, canAccessBranch } from "@/lib/server/branch-permissions";
import { writeAuditLog } from "@/lib/server/audit";
import { buildEmployeesExportTable } from "@/lib/services/employee-import";
import { createPdfBuffer, createXlsxBuffer, fileResponse } from "@/lib/server/exporters";
import { fail, ok } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const params = request.nextUrl.searchParams;
    const format = params.get("format") || "json";
    const canFinancial = canViewFinancialData(auth.context);
    let query = scopeByBranch(auth.supabase.from("employees").select("*, branches:branches!employees_branch_id_fkey(name)").order("full_name"), auth.context, "branch_id");
    const branchId = params.get("branchId") || params.get("branch_id");
    if (branchId) {
      if (!canAccessBranch(auth.context, branchId)) return fail("Você não tem acesso a esta filial.", 403);
      query = query.eq("branch_id", branchId);
    }
    if (params.get("role")) query = query.ilike("role", `%${params.get("role")}%`);
    if (params.get("sector")) query = query.ilike("sector", `%${params.get("sector")}%`);
    if (params.get("status") === "active" || params.get("active") === "true") query = query.eq("active", true);
    if (params.get("status") === "inactive" || params.get("active") === "false") query = query.eq("active", false);
    if (params.get("employmentType")) query = query.eq("employment_type", params.get("employmentType"));
    const paymentDay = params.get("paymentDay") || params.get("payment_day");
    if (paymentDay) query = query.eq("payment_day", Number(paymentDay));
    const q = (params.get("q") || "").trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,registration_code.ilike.%${q}%,document.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) return fail("Erro ao exportar funcionários.", 500, error.message);
    const rows = (data || []).map((employee: any) => {
      const { pin_hash: _pin_hash, ...safe } = employee;
      if (!canFinancial) {
        safe.monthly_salary = 0;
        safe.daily_rate = 0;
        safe.pix_key = null;
        safe.bank_name = null;
        safe.bank_agency = null;
        safe.bank_account = null;
      }
      return safe;
    });
    const table = buildEmployeesExportTable(rows, canFinancial);
    await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: `export_employees_${format}`, entity: "employees", newData: { filters: Object.fromEntries(params.entries()), rows: rows.length, financial: canFinancial, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") } });
    if (format === "pdf") return fileResponse(await createPdfBuffer(table), "funcionarios-brilho-do-sol.pdf", "application/pdf");
    if (format === "xlsx") return fileResponse(await createXlsxBuffer(table), "funcionarios-brilho-do-sol.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return ok({ employees: rows, table });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao exportar funcionários.", 500);
  }
}
