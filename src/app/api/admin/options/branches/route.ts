import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { scopeByBranch } from "@/lib/server/branch-permissions";
import { fail, ok } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const active = request.nextUrl.searchParams.get("status") !== "inactive";
  let query = scopeByBranch(auth.supabase.from("branches").select("id, name, code, active").order("name"), auth.context, "id");
  if (active) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return fail("Erro ao carregar filiais leves.", 500, error.message);
  return ok({ branches: data || [] });
}
