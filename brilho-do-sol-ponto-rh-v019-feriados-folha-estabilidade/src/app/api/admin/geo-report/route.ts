import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { canAccessBranch, scopeByBranch } from "@/lib/server/branch-permissions";
import { writeAuditLog } from "@/lib/server/audit";
import { fail, ok } from "@/lib/server/http";
import { createPdfBuffer, createXlsxBuffer, fileResponse, type ExportTable } from "@/lib/server/exporters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildGeoTable(rows: any[]): ExportTable {
  return {
    title: "Relatório de Geolocalização",
    subtitle: "Auditoria de distância, precisão GPS e pontos fora do raio por filial.",
    summary: [
      { label: "Pontos", value: rows.length },
      { label: "Dentro do raio", value: rows.filter((row) => row.inside_allowed_radius).length },
      { label: "Fora do raio", value: rows.filter((row) => !row.inside_allowed_radius).length },
      { label: "GPS ruim", value: rows.filter((row) => Number(row.gps_accuracy_meters || 0) > 100).length }
    ],
    headers: ["Funcionário", "Filial", "Data/Hora", "Status", "Distância", "Precisão", "Dentro do raio", "Google Maps"],
    rows: rows.map((row) => [
      row.employees?.full_name || "-",
      row.branches?.name || "-",
      new Date(row.entry_timestamp).toLocaleString("pt-BR"),
      row.status,
      row.distance_meters ? `${row.distance_meters}m` : "-",
      row.gps_accuracy_meters ? `${Math.round(Number(row.gps_accuracy_meters))}m` : "-",
      row.inside_allowed_radius ? "Sim" : "Não",
      row.latitude && row.longitude ? `https://maps.google.com/?q=${row.latitude},${row.longitude}` : "-"
    ]),
    footer: "Brilho do Sol Supermercado — Relatório de geolocalização"
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const params = request.nextUrl.searchParams;
  if (params.get("branchId") && !canAccessBranch(auth.context, params.get("branchId"))) return fail("Você não tem acesso a esta filial.", 403);
  let query = scopeByBranch(auth.supabase.from("time_entries").select("*, employees(full_name,registration_code), branches:branches!time_entries_branch_id_fkey(name)").order("entry_timestamp", { ascending: false }).limit(1500), auth.context, "branch_id");
  if (params.get("branchId")) query = query.eq("branch_id", params.get("branchId"));
  if (params.get("employeeId")) query = query.eq("employee_id", params.get("employeeId"));
  if (params.get("startDate")) query = query.gte("entry_date", params.get("startDate"));
  if (params.get("endDate")) query = query.lte("entry_date", params.get("endDate"));
  if (params.get("inside") === "true") query = query.eq("inside_allowed_radius", true);
  if (params.get("inside") === "false") query = query.eq("inside_allowed_radius", false);
  const { data, error } = await query;
  if (error) return fail("Erro ao gerar relatório de geolocalização.", 500, error.message);
  const table = buildGeoTable(data || []);
  const format = params.get("format") || "json";
  await writeAuditLog({ supabase: auth.supabase, context: auth.context, action: `export_geo_${format}`, entity: "geo_report", newData: { rows: data?.length || 0, filters: Object.fromEntries(params.entries()) } });
  if (format === "pdf") return fileResponse(await createPdfBuffer(table), "relatorio-geolocalizacao.pdf", "application/pdf");
  if (format === "xlsx") return fileResponse(await createXlsxBuffer(table), "relatorio-geolocalizacao.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return ok({ rows: data || [], table });
}
