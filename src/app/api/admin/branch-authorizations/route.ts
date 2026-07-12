import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok, readJson } from "@/lib/server/http";


export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  let query = auth.supabase
    .from("employee_branch_authorizations")
    .select("*, employees(full_name), branches:branches!branch_authorizations_branch_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, error } = await query;
  if (error) return fail("Erro ao listar autorizações.", 500, error.message);
  return ok({ authorizations: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  const payload = {
    employee_id: body.employee_id,
    branch_id: body.branch_id,
    starts_on: body.starts_on,
    ends_on: body.ends_on,
    reason: String(body.reason || "").trim(),
    active: body.active ?? true,
    created_by: auth.context.userId
  };
  if (!payload.employee_id || !payload.branch_id || !payload.starts_on || !payload.ends_on || !payload.reason) {
    return fail("Preencha funcionário, filial, período e motivo.", 400);
  }
  const { data, error } = await auth.supabase.from("employee_branch_authorizations").insert(payload).select("*").single();
  if (error) return fail("Erro ao criar autorização.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "create", entity: "employee_branch_authorizations", entityId: data.id, newData: data });
  return ok({ authorization: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.id) return fail("ID obrigatório.", 400);
  const { data: oldData } = await auth.supabase.from("employee_branch_authorizations").select("*").eq("id", body.id).maybeSingle();
  const payload = {
    employee_id: body.employee_id,
    branch_id: body.branch_id,
    starts_on: body.starts_on,
    ends_on: body.ends_on,
    reason: String(body.reason || "").trim(),
    active: body.active ?? true
  };
  const { data, error } = await auth.supabase.from("employee_branch_authorizations").update(payload).eq("id", body.id).select("*").single();
  if (error) return fail("Erro ao atualizar autorização.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "update", entity: "employee_branch_authorizations", entityId: data.id, oldData, newData: data });
  return ok({ authorization: data });
}
