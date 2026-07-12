import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { canAccessBranch, canManageBranches, scopeByBranch } from "@/lib/server/branch-permissions";
import { fail, ok, readJson } from "@/lib/server/http";

function normalizeBranchPayload(body: any, contextUserId?: string) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radius = Number(body.allowed_radius_meters || 900);
  const hasValidGps = Number.isFinite(latitude) && Number.isFinite(longitude) && radius > 0 && Boolean(body.geofence_enabled ?? true);
  const now = new Date().toISOString();
  return {
    name: String(body.name || "").trim(),
    type: body.type || "filial",
    address: String(body.address || "").trim(),
    latitude,
    longitude,
    allowed_radius_meters: radius,
    google_maps_url: body.google_maps_url ? String(body.google_maps_url).trim() : null,
    map_place_id: body.map_place_id ? String(body.map_place_id).trim() : null,
    geofence_enabled: body.geofence_enabled ?? true,
    geolocation_configured_at: hasValidGps ? now : null,
    geolocation_configured_by: hasValidGps ? contextUserId || null : null,
    geolocation_confirmed_at: hasValidGps ? now : null,
    geolocation_confirmed_by: hasValidGps ? contextUserId || null : null,
    geolocation_status: hasValidGps ? "confirmed" : "pending",
    gps_ready: hasValidGps,
    active: body.active ?? true
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const status = request.nextUrl.searchParams.get("status");
  const q = request.nextUrl.searchParams.get("q");
  let query = auth.supabase.from("branches").select("*").order("name", { ascending: true });
  query = scopeByBranch(query, auth.context, "id");
  if (status === "active") query = query.eq("active", true);
  if (status === "inactive") query = query.eq("active", false);
  if (q) query = query.ilike("name", `%${q}%`);
  const [{ data, error }, employeesRes] = await Promise.all([
    query,
    scopeByBranch(auth.supabase.from("employees").select("id,branch_id").eq("active", true), auth.context, "branch_id")
  ]);
  if (error) return fail("Erro ao listar filiais.", 500, error.message);
  if (employeesRes.error) return fail("Erro ao calcular funcionários por filial.", 500, employeesRes.error.message);
  const employees = employeesRes.data || [];
  const branches = (data || []).map((branch: any) => ({
    ...branch,
    employee_count: employees.filter((employee: any) => employee.branch_id === branch.id).length
  }));
  return ok({ branches });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  const payload = normalizeBranchPayload(body, auth.context.userId);
  if (!payload.name || !payload.address || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    return fail("Preencha nome, endereço, latitude e longitude.", 400);
  }
  if (!canManageBranches(auth.context)) return fail("Você não tem permissão para criar unidades.", 403);
  const { data, error } = await auth.supabase.from("branches").insert(payload).select("*").single();
  if (error) return fail("Erro ao criar filial.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "create_geolocated", entity: "branches", entityId: data.id, newData: data });
  return ok({ branch: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.id) return fail("ID da filial obrigatório.", 400);
  if (!canManageBranches(auth.context)) return fail("Você não tem permissão para editar unidades.", 403);
  if (!canAccessBranch(auth.context, body.id)) return fail("Você não tem acesso a esta filial.", 403);
  const { data: oldData } = await auth.supabase.from("branches").select("*").eq("id", body.id).maybeSingle();
  const payload = normalizeBranchPayload(body, auth.context.userId);
  const { data, error } = await auth.supabase.from("branches").update(payload).eq("id", body.id).select("*").single();
  if (error) return fail("Erro ao atualizar filial.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "update_geolocation", entity: "branches", entityId: data.id, oldData, newData: data });
  return ok({ branch: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return fail("ID da filial obrigatório.", 400);
  if (!canManageBranches(auth.context)) return fail("Você não tem permissão para desativar unidades.", 403);
  if (!canAccessBranch(auth.context, id)) return fail("Você não tem acesso a esta filial.", 403);
  const { data: oldData } = await auth.supabase.from("branches").select("*").eq("id", id).maybeSingle();
  const { data, error } = await auth.supabase.from("branches").update({ active: false }).eq("id", id).select("*").single();
  if (error) return fail("Erro ao desativar filial.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "deactivate", entity: "branches", entityId: id, oldData, newData: data });
  return ok({ branch: data });
}
