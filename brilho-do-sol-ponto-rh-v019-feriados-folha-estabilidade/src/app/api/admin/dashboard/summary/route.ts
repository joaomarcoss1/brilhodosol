import { NextRequest } from "next/server";
import { dateKeyInTimezone } from "@/lib/calculations";
import { fetchOperationalHolidays, pendingHolidayDecisions, syncUpcomingHolidayDecisions } from "@/lib/services/holiday-operations";
import { requireAdmin } from "@/lib/server/auth";
import { getAllowedBranchIds, scopeByBranch } from "@/lib/server/branch-permissions";
import { fail, ok } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const today = dateKeyInTimezone();
    const employeesQuery = scopeByBranch(auth.supabase.from("employees").select("id", { count: "exact", head: true }).eq("active", true), auth.context, "branch_id");
    const branchesQuery = scopeByBranch(auth.supabase.from("branches").select("id", { count: "exact", head: true }).eq("active", true), auth.context, "id");
    const pointsQuery = scopeByBranch(auth.supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("entry_date", today), auth.context, "branch_id");
    const pendingQuery = scopeByBranch(auth.supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("entry_date", today).eq("status", "pending_review"), auth.context, "branch_id");
    const outsideQuery = scopeByBranch(auth.supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("entry_date", today).eq("inside_allowed_radius", false), auth.context, "branch_id");
    const [employees, branches, points, pending, outside] = await Promise.all([employeesQuery, branchesQuery, pointsQuery, pendingQuery, outsideQuery]);
    const error = employees.error || branches.error || points.error || pending.error || outside.error;
    if (error) return fail("Erro ao carregar resumo do dashboard.", 500, error.message);

    let pendingHolidayCount = 0;
    try {
      const sync = await syncUpcomingHolidayDecisions({ supabase: auth.supabase, syncedBy: auth.context.id });
      let branchIds = getAllowedBranchIds(auth.context);
      if (branchIds === null) {
        const { data: activeBranches, error: activeBranchError } = await auth.supabase.from("branches").select("id").eq("active", true);
        if (activeBranchError) throw new Error(activeBranchError.message);
        branchIds = (activeBranches || []).map((branch) => branch.id);
      }
      const holidays = await fetchOperationalHolidays({
        supabase: auth.supabase,
        startDate: sync.today,
        endDate: sync.until,
        branchIds
      });
      pendingHolidayCount = pendingHolidayDecisions(holidays).length;
    } catch (holidayError) {
      console.error("[dashboard] não foi possível sincronizar feriados", holidayError);
    }

    return ok({ summary: { activeEmployees: employees.count || 0, activeBranches: branches.count || 0, pointsToday: points.count || 0, pendingReview: pending.count || 0, outsideRadius: outside.count || 0, pendingHolidays: pendingHolidayCount } });
  } catch (error) {
    return fail("Erro ao carregar resumo do dashboard.", 500, error instanceof Error ? error.message : error);
  }
}
