"use client";

import { AlertTriangle, Building2, Clock3, FileCheck2, TrendingUp, Users, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, SectionTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/client/admin-api";
import { formatMoney } from "@/lib/format";

const cardConfig = [
  ["activeEmployees", "Funcionários ativos", Users],
  ["branches", "Filiais ativas", Building2],
  ["punchesToday", "Pontos hoje", Clock3],
  ["absentToday", "Ausentes hoje", AlertTriangle],
  ["pendingJustifications", "Justificativas pendentes", FileCheck2],
  ["lateToday", "Atrasos hoje", TrendingUp],
  ["earlyLeaveToday", "Saídas antecipadas", AlertTriangle],
  ["pendingOvertime", "Horas extras pendentes", Clock3],
  ["overtimePeriod", "Horas extras período", Clock3],
  ["estimatedPayroll", "Folha estimada", WalletCards],
  ["openPayrolls", "Folhas abertas", FileCheck2],
  ["closedPayrolls", "Folhas fechadas", FileCheck2],
  ["inconsistencyAlerts", "Alertas", AlertTriangle]
] as const;

function BarList({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex min-w-0 justify-between gap-3 text-xs font-bold text-slate-600">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0">{item.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-gradient-to-r from-brand-700 via-brand-500 to-sun-400 transition-all duration-700" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<any>("/api/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminShell>
      <SectionTitle title="Dashboard" description="Indicadores reais de ponto, RH e folha com base no banco de dados." />
      {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          ))}
        </div>
      ) : null}
      {data ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cardConfig.map(([key, label, Icon]) => (
              <Card key={key} className="premium-surface">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-black uppercase tracking-[0.10em] text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                      {key === "estimatedPayroll"
                        ? formatMoney(data.cards[key])
                        : key === "overtimePeriod"
                          ? `${Math.floor(data.cards[key] / 60)}h ${String(data.cards[key] % 60).padStart(2, "0")}min`
                          : data.cards[key]}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-2xl bg-gradient-to-br from-brand-50 to-sun-50 p-3 text-brand-700 shadow-inner">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
          {data.alerts.length ? (
            <Card className="border-amber-200 bg-amber-50">
              <h2 className="mb-2 font-black text-amber-950">Alertas importantes</h2>
              <div className="grid gap-2 text-sm font-semibold text-amber-900">
                {data.alerts.map((alert: string) => (
                  <p key={alert}>{alert}</p>
                ))}
              </div>
            </Card>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h2 className="mb-3 font-black">Funcionários por filial</h2>
              <BarList data={data.totalByBranch.map((item: any) => ({ label: item.branch, value: item.total }))} />
            </Card>
            <Card>
              <h2 className="mb-3 font-black">Atrasos por filial</h2>
              <BarList data={data.charts.lateByBranch} />
            </Card>
            <Card>
              <h2 className="mb-3 font-black">Custo de folha por filial</h2>
              <BarList data={data.charts.payrollByBranch.map((item: any) => ({ label: item.label, value: Math.round(item.value) }))} />
            </Card>
            <Card>
              <h2 className="mb-3 font-black">Horas extras por funcionário</h2>
              <BarList data={(data.charts.overtimeByEmployee || []).map((item: any) => ({ label: item.label, value: Math.round(item.value) }))} />
            </Card>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
