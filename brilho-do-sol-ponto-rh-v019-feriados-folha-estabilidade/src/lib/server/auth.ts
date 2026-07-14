import type { NextRequest } from "next/server";
import { fail } from "@/lib/server/http";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/server/db";
import type { AdminRole } from "@/types/domain";

export type AdminContext = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  branchId: string | null;
  allowedBranchIds: string[];
  canViewFinancialData: boolean;
};

export async function requireAdmin(request: NextRequest, allowedRoles?: AdminRole[]) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return { error: fail("Login administrativo obrigatório.", 401) };
  }

  const authClient = getSupabaseAuthClient();
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user?.email) {
    return { error: fail("Sessão inválida ou expirada.", 401) };
  }

  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase
    .from("admin_users")
    .select("id, auth_user_id, email, full_name, role, active, branch_id, allowed_branch_ids, can_view_financial_data")
    .or(`auth_user_id.eq.${userData.user.id},email.eq.${userData.user.email}`)
    .maybeSingle();

  if (profileError) return { error: fail("Erro ao validar permissões administrativas.", 500, profileError.message) };
  if (!profile?.active) return { error: fail("Usuário sem permissão administrativa ativa.", 403) };
  if (allowedRoles?.length && !allowedRoles.includes(profile.role)) {
    return { error: fail("Permissão insuficiente para esta ação.", 403) };
  }

  const context: AdminContext = {
    id: profile.id,
    userId: userData.user.id,
    email: userData.user.email,
    name: profile.full_name,
    role: profile.role,
    branchId: profile.branch_id || null,
    allowedBranchIds: Array.isArray(profile.allowed_branch_ids) ? profile.allowed_branch_ids : [],
    canViewFinancialData: Boolean(profile.can_view_financial_data)
  };

  return { context, supabase };
}
