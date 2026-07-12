import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";
import { getClientIp, recordPinAttempt } from "@/lib/server/pin";

function firstName(fullName: string) {
  return String(fullName || "").trim().split(/\s+/)[0] || "Funcionário";
}

function maskRegistration(code?: string | null) {
  const raw = String(code || "").trim();
  if (!raw) return null;
  if (raw.length <= 2) return raw;
  return `${raw.slice(0, 2)}${"•".repeat(Math.min(4, Math.max(1, raw.length - 2)))}`;
}

export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get("q") || "").trim();
    const branchId = request.nextUrl.searchParams.get("branchId") || "";
    if (query.length < 2 && !branchId) return ok({ employees: [], hint: "Digite pelo menos 2 letras ou sua matrícula." });

    const supabase = getSupabaseAdmin();
    const ip = getClientIp(request.headers);
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabase
      .from("pin_attempt_logs")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("reason", "public_employee_search")
      .gte("created_at", since);
    if (Number(count || 0) > 40) return fail("Muitas buscas em sequência. Aguarde alguns instantes.", 429);
    await recordPinAttempt({ supabase, attemptedName: query || branchId, headers: request.headers, deviceInfo: request.headers.get("user-agent"), success: true, reason: "public_employee_search" });

    let builder = supabase
      .from("employees")
      .select("id, registration_code, full_name, role, branch_id, branches:branches!employees_branch_id_fkey(name)")
      .eq("active", true)
      .order("full_name", { ascending: true })
      .limit(10);

    if (branchId) builder = builder.eq("branch_id", branchId);
    if (query) {
      const safe = query.replace(/[,%]/g, "");
      builder = builder.or(`full_name.ilike.%${safe}%,registration_code.ilike.%${safe}%`);
    }

    const { data, error } = await builder;
    if (error) return fail("Não foi possível buscar funcionários.", 500, error.message);

    const employees = (data || []).map((employee: any) => {
      const code = String(employee.registration_code || "").trim();
      return {
        id: employee.id,
        registration_code: code || null,
        registration_code_masked: maskRegistration(code),
        display_name: code ? `${maskRegistration(code)} • ${firstName(employee.full_name)}` : firstName(employee.full_name),
        role: employee.role,
        branch_id: employee.branch_id,
        branch_name: employee.branches?.name
      };
    });

    return ok({ employees });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}
