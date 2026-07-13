import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok, readJson } from "@/lib/server/http";
import type { AdminRole } from "@/types/domain";

const ALLOWED_ROLES: AdminRole[] = ["master_admin", "admin", "admin_geral", "gerente_filial", "rh_financeiro"];

function parseBranchIds(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function normalizePayload(body: any) {
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const role = (body.role || "admin_geral") as AdminRole;
  return {
    email,
    full_name: fullName,
    role: ALLOWED_ROLES.includes(role) ? role : "admin_geral",
    branch_id: body.branch_id || null,
    allowed_branch_ids: parseBranchIds(body.allowed_branch_ids),
    can_view_financial_data: Boolean(body.can_view_financial_data),
    active: body.active ?? true
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, ["master_admin"]);
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("admin_users")
    .select("*, branches:branches!admin_users_branch_id_fkey(name)")
    .order("created_at", { ascending: false });
  if (error) return fail("Erro ao listar administradores.", 500, error.message);
  return ok({ admins: data || [], currentRole: auth.context.role });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, ["master_admin"]);
  if ("error" in auth) return auth.error;

  const body = await readJson<any>(request);
  const password = String(body.password || "").trim();
  const payload = normalizePayload(body);
  if (!payload.email || !payload.full_name) return fail("Preencha e-mail e nome.", 400);

  const { data: existingAdmin } = await auth.supabase
    .from("admin_users")
    .select("*")
    .eq("email", payload.email)
    .maybeSingle();

  let authUserId: string | null = existingAdmin?.auth_user_id || null;

  if (password) {
    if (password.length < 6) return fail("A senha inicial deve ter pelo menos 6 caracteres.", 400);
    if (authUserId) {
      const { error: updatePasswordError } = await auth.supabase.auth.admin.updateUserById(authUserId, { password });
      if (updatePasswordError) return fail("Não foi possível atualizar a senha inicial do administrador.", 500, updatePasswordError.message);
    } else {
      const { data: createdUser, error: createError } = await auth.supabase.auth.admin.createUser({
        email: payload.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.full_name,
          role: payload.role
        }
      });
      if (createError && !createError.message.toLowerCase().includes("already")) {
        return fail("Não foi possível criar o login no Supabase Auth.", 500, createError.message);
      }
      authUserId = createdUser.user?.id || null;
    }
  }

  if (existingAdmin) {
    if (existingAdmin.email === auth.context.email && payload.role !== "master_admin") {
      return fail("Você não pode remover seu próprio perfil master por esta tela.", 409);
    }
    const { data, error } = await auth.supabase
      .from("admin_users")
      .update({ ...payload, auth_user_id: authUserId, active: true })
      .eq("id", existingAdmin.id)
      .select("*")
      .single();
    if (error) return fail("Erro ao promover/atualizar administrador.", 500, error.message);
    await writeAuditLog({
      supabase: auth.supabase,
      context: auth.context,
      action: "promote_or_update",
      entity: "admin_users",
      entityId: data.id,
      oldData: existingAdmin,
      newData: data
    });
    return ok({ admin: data, message: "Usuário promovido/atualizado como administrador." });
  }

  const { data, error } = await auth.supabase
    .from("admin_users")
    .insert({ ...payload, auth_user_id: authUserId })
    .select("*")
    .single();
  if (error) return fail("Erro ao criar administrador.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "create", entity: "admin_users", entityId: data.id, newData: data });
  return ok({ admin: data, message: "Administrador criado com sucesso." });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request, ["master_admin"]);
  if ("error" in auth) return auth.error;
  const body = await readJson<any>(request);
  if (!body.id) return fail("ID obrigatório.", 400);
  const { data: oldData } = await auth.supabase.from("admin_users").select("*").eq("id", body.id).maybeSingle();
  if (!oldData) return fail("Administrador não encontrado.", 404);
  const payload = normalizePayload(body);
  if (oldData.email === auth.context.email && payload.role !== "master_admin") {
    return fail("Você não pode remover seu próprio perfil master por esta tela.", 409);
  }
  const password = String(body.password || "").trim();
  if (password) {
    if (password.length < 6) return fail("A nova senha deve ter pelo menos 6 caracteres.", 400);
    if (!oldData.auth_user_id) return fail("Este administrador ainda não tem login vinculado. Crie uma senha inicial pela opção Novo registro usando o mesmo e-mail.", 409);
    const { error: updatePasswordError } = await auth.supabase.auth.admin.updateUserById(oldData.auth_user_id, { password });
    if (updatePasswordError) return fail("Não foi possível atualizar a senha.", 500, updatePasswordError.message);
  }
  const { data, error } = await auth.supabase.from("admin_users").update(payload).eq("id", body.id).select("*").single();
  if (error) return fail("Erro ao atualizar administrador.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "update", entity: "admin_users", entityId: data.id, oldData, newData: data });
  return ok({ admin: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request, ["master_admin"]);
  if ("error" in auth) return auth.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return fail("ID obrigatório.", 400);
  const { data: oldData } = await auth.supabase.from("admin_users").select("*").eq("id", id).maybeSingle();
  if (!oldData) return fail("Administrador não encontrado.", 404);
  if (oldData.email === auth.context.email) return fail("Você não pode desativar seu próprio usuário master por aqui.", 409);
  const { data, error } = await auth.supabase.from("admin_users").update({ active: false }).eq("id", id).select("*").single();
  if (error) return fail("Erro ao desativar administrador.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "deactivate", entity: "admin_users", entityId: id, oldData, newData: data });
  return ok({ admin: data });
}
