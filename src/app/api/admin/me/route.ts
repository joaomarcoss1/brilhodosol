import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { ok } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  return ok({
    admin: {
      id: auth.context.id,
      userId: auth.context.userId,
      email: auth.context.email,
      name: auth.context.name,
      role: auth.context.role,
      branchId: auth.context.branchId,
      allowedBranchIds: auth.context.allowedBranchIds,
      canViewFinancialData: auth.context.canViewFinancialData
    }
  });
}
