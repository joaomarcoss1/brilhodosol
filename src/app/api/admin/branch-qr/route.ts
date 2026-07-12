import crypto from "crypto";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { canManageBranches, assertCanAccessBranch } from "@/lib/server/branch-permissions";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok } from "@/lib/server/http";
import { createPdfBuffer, fileResponse } from "@/lib/server/exporters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function token() { return crypto.randomBytes(18).toString("base64url"); }

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  if (!canManageBranches(auth.context)) return fail("Permissão insuficiente para gerar QR de filial.", 403);
  const body = await request.json().catch(() => ({}));
  const branchId = body.branch_id;
  const branchCheck = assertCanAccessBranch(auth.context, branchId);
  if (branchCheck) return branchCheck;
  const { data: branch } = await auth.supabase.from("branches").select("id,name").eq("id", branchId).maybeSingle();
  if (!branch) return fail("Filial não encontrada.", 404);
  const validUntil = body.valid_until || null;
  const { data, error } = await auth.supabase.from("branch_qr_tokens").insert({ branch_id: branchId, token: token(), valid_until: validUntil, active: true, created_by: auth.context.id }).select("*").single();
  if (error) return fail("Erro ao gerar QR da filial.", 500, error.message);
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: "generate_branch_qr", entity: "branch_qr_tokens", entityId: data.id, newData: { branch: branch.name, validUntil } });
  return ok({ qr: data, printable_code: `${branch.name} • ${data.token}` });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const branchId = request.nextUrl.searchParams.get("branchId");
  const format = request.nextUrl.searchParams.get("format");
  const branchCheck = assertCanAccessBranch(auth.context, branchId);
  if (branchCheck) return branchCheck;
  const { data: branch } = await auth.supabase.from("branches").select("id,name,address").eq("id", branchId).maybeSingle();
  if (!branch) return fail("Filial não encontrada.", 404);
  const { data: qr } = await auth.supabase.from("branch_qr_tokens").select("*").eq("branch_id", branchId).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (format === "pdf") {
    const table = {
      title: "QR Code da Filial",
      subtitle: "Use este código para reforçar a segurança do ponto por filial.",
      meta: [`Filial: ${branch.name}`, `Endereço: ${branch.address || "-"}`, `Validade: ${qr?.valid_until || "sem validade definida"}`],
      summary: [ { label: "Filial", value: branch.name }, { label: "Status", value: qr ? "Ativo" : "Não gerado" } ],
      headers: ["Campo", "Valor"],
      rows: [["Código", qr?.token || "Gere um código antes de imprimir"], ["Instrução", "Escaneie/valide este código no ponto da filial junto com GPS e PIN de 4 dígitos."]],
      footer: "Brilho do Sol Supermercado — QR de filial"
    };
    return fileResponse(await createPdfBuffer(table), `qr-filial-${branch.name}.pdf`, "application/pdf");
  }
  return ok({ branch, qr });
}
