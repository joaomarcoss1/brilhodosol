import { NextRequest } from "next/server";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";
import { writeAuditLog } from "@/lib/server/audit";

async function findAuthUserByEmail(supabase: ReturnType<typeof getSupabaseAdmin>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const user = data?.users?.find((item) => String(item.email || "").toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}


export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase.from("admin_users").select("id", { count: "exact", head: true }).eq("role", "master_admin").eq("active", true);
    if (error) return fail("Não foi possível verificar a configuração inicial.", 500, error.message);
    return ok({ setupAvailable: (count || 0) === 0 && Boolean(process.env.MASTER_SETUP_TOKEN && process.env.MASTER_ADMIN_EMAIL) });
  } catch (error) {
    return fail("Não foi possível verificar a configuração inicial.", 500, error instanceof Error ? error.message : error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ setupToken?: string; email?: string; password?: string; name?: string }>(request);
    const setupToken = process.env.MASTER_SETUP_TOKEN;
    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    const masterName = process.env.MASTER_ADMIN_NAME || "Joao Marcos";
    if (!setupToken || !masterEmail) return fail("Bootstrap master desativado. Configure MASTER_ADMIN_EMAIL e MASTER_SETUP_TOKEN apenas na configuração inicial.", 403);
    if (body.setupToken !== setupToken) return fail("Token de configuração inválido.", 403);

    const supabase = getSupabaseAdmin();

    const { data: existingMasters, error: masterCheckError } = await supabase
      .from("admin_users")
      .select("id,email")
      .eq("role", "master_admin")
      .eq("active", true)
      .limit(2);
    if (masterCheckError) return fail("Não foi possível validar administradores master existentes.", 500, masterCheckError.message);
    if (process.env.NODE_ENV === "production" && (existingMasters || []).length > 0) {
      await writeAuditLog({
        supabase,
        action: "blocked_bootstrap_master_production",
        entity: "admin_users",
        newData: { reason: "active_master_exists", requestedEmail: body.email || masterEmail }
      });
      return fail("Bootstrap master desativado em produção.", 403);
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    let authUserId: string | null = null;
    let email = masterEmail;

    if (token) {
      const authClient = getSupabaseAuthClient();
      const { data: userData, error: userError } = await authClient.auth.getUser(token);
      if (userError || !userData.user?.email) return fail("Sessão inválida.", 401);
      if (userData.user.email.toLowerCase() !== masterEmail.toLowerCase()) {
        return fail("Este login não corresponde ao MASTER_ADMIN_EMAIL.", 403);
      }
      authUserId = userData.user.id;
      email = userData.user.email;
    } else {
      const requestedEmail = String(body.email || masterEmail).trim().toLowerCase();
      const password = String(body.password || process.env.MASTER_ADMIN_PASSWORD || "").trim();
      if (requestedEmail !== masterEmail.toLowerCase()) return fail("O e-mail informado não corresponde ao MASTER_ADMIN_EMAIL.", 403);
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return fail("Informe uma senha master com pelo menos 10 caracteres, contendo letra e número.", 400);
      }

      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email: requestedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.name || masterName,
          role: "master_admin"
        }
      });

      if (createError && !createError.message.toLowerCase().includes("already")) {
        return fail("Não foi possível criar o usuário master no Supabase Auth.", 500, createError.message);
      }
      const authUser = createdUser.user || await findAuthUserByEmail(supabase, requestedEmail);
      if (!authUser?.id) return fail("Não foi possível localizar ou criar o usuário master no Supabase Auth.", 500);
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.name || masterName,
          role: "master_admin"
        }
      });
      if (updateAuthError) return fail("Não foi possível atualizar o usuário master no Supabase Auth.", 500, updateAuthError.message);
      authUserId = authUser.id;
      email = requestedEmail;
    }

    const profilePayload: Record<string, unknown> = {
      email,
      full_name: body.name || masterName,
      role: "master_admin",
      active: true
    };
    if (authUserId) profilePayload.auth_user_id = authUserId;

    const { data: admin, error } = await supabase
      .from("admin_users")
      .upsert(
        profilePayload,
        { onConflict: "email" }
      )
      .select("*")
      .single();

    if (error) return fail("Não foi possível ativar o admin master.", 500, error.message);
    await writeAuditLog({
      supabase,
      action: "bootstrap_master_admin",
      entity: "admin_users",
      entityId: admin.id,
      newData: admin
    });
    return ok({ admin, message: "Admin master criado e ativado com sucesso." });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}
