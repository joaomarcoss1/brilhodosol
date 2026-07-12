"use client";
import { AlertTriangle, Building2, Clock3, MapPin, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/client/admin-api";

export function BranchManagerPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [geoRows, setGeoRows] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<any>("/api/admin/dashboard").then(setDashboard).catch((err) => setError(err.message));
    adminFetch<any>("/api/admin/geo-report").then((data) => setGeoRows(data.rows || [])).catch(() => undefined);
  }, []);
  const cards = [
    { label: "Funcionários", value: dashboard?.summary?.activeEmployees ?? "-", icon: Users },
    { label: "Pontos hoje", value: dashboard?.summary?.todayEntries ?? "-", icon: Clock3 },
    { label: "Pendências", value: dashboard?.summary?.pendingReviews ?? "-", icon: AlertTriangle },
    { label: "Fora do raio", value: geoRows.filter((row) => !row.inside_allowed_radius).length, icon: MapPin }
  ];
  return (
    <AdminShell>
      <SectionTitle title="Painel do gerente de filial" description="Visão operacional sem dados financeiros: presença, ausências, atrasos, justificativas, pontos fora do raio e escala da loja." />
      {error ? <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <Card key={card.label}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-800"><Icon className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{card.label}</p><p className="text-2xl font-black text-slate-950">{card.value}</p></div></div></Card>;
        })}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-xl font-black text-slate-950"><Building2 className="mr-2 inline h-5 w-5 text-brand-700" /> Rotina da loja</h2>
          <div className="grid gap-2 text-sm font-semibold text-slate-600">
            <p>• Conferir ausentes e atrasados no início do expediente.</p>
            <p>• Revisar justificativas da própria filial.</p>
            <p>• Solicitar ajustes ou autorizações ao RH quando necessário.</p>
            <p>• Acompanhar pontos fora do raio e GPS impreciso.</p>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-xl font-black text-slate-950">Últimas ocorrências de geolocalização</h2>
          <div className="grid gap-2">
            {geoRows.slice(0, 6).map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"><span className="font-bold text-slate-700">{row.employees?.full_name || "Funcionário"}</span><Badge tone={row.inside_allowed_radius ? "green" : "red"}>{row.inside_allowed_radius ? "Dentro" : "Fora"}</Badge></div>)}
            {!geoRows.length ? <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">Nenhuma ocorrência recente.</p> : null}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
