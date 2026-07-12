import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { scopeByBranch } from "@/lib/server/branch-permissions";
import { fail, ok } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const employeesQuery = scopeByBranch(auth.supabase.from("employees").select("id", { count: "exact", head: true }).eq("active", true), auth.context, "branch_id");
    const branchesQuery = scopeByBranch(auth.supabase.from("branches").select("id", { count: "exact", head: true }).eq("active", true), auth.context, "id");
    const pointsQuery = scopeByBranch(auth.supabase.from("time_entries").select("id,status,inside_allowed_radius", { count: "exact" }).eq("entry_date", today).limit(200), auth.context, "branch_id");
    const [employees, branches, points] = await Promise.all([employeesQuery, branchesQuery, pointsQuery]);
    if (employees.error || branches.error || points.error) return fail("Erro ao carregar resumo do dashboard.", 500, employees.error?.message || branches.error?.message || points.error?.message);
    const rows = points.data || [];
    return ok({
      summary: {
        activeEmployees: employees.count || 0,
        activeBranches: branches.count || 0,
        pointsToday: points.count || rows.length,
        pendingReview: rows.filter((row: any) => row.status === "pending_review").length,
        outsideRadius: rows.filter((row: any) => row.inside_allowed_radius === false).length
      }
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao carregar resumo do dashboard.", 500);
  }
}
