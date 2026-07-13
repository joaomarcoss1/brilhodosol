"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { actionLabels, statusLabels } from "@/lib/constants";
import { adminFetch } from "@/lib/client/admin-api";
import { formatDateTime, minutesToHourText } from "@/lib/format";
import type { TimeAction, TimeEntryStatus } from "@/types/domain";

export function TimeEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [adjustment, setAdjustment] = useState<Record<string, any>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminFetch<any>("/api/admin/employees?status=active").then((data) => setEmployees(data.employees || [])).catch(() => undefined);
    adminFetch<any>("/api/admin/branches?status=active").then((data) => setBranches(data.branches || [])).catch(() => undefined);
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    try {
      const data = await adminFetch<any>(`/api/admin/time-entries?${params.toString()}`);
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pontos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(entry: any) {
    setSelected(entry);
    setAdjustment({
      entry_timestamp: entry.entry_timestamp?.slice(0, 16),
      action: entry.action,
      status: "adjusted",
      late_minutes: entry.late_minutes,
      early_leave_minutes: entry.early_leave_minutes,
      justification_text: entry.justification_text || "",
      adjustment_reason: ""
    });
  }

  async function saveAdjustment() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await adminFetch("/api/admin/time-entries", {
        method: "PATCH",
        body: JSON.stringify({
          id: selected.id,
          ...adjustment,
          entry_timestamp: adjustment.entry_timestamp ? new Date(adjustment.entry_timestamp).toISOString() : undefined
        })
      });
      setMessage("Ponto ajustado com auditoria.");
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ajustar ponto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell>
      <SectionTitle title="Registros de ponto" description="Filtro completo por filial, funcionário, período, status, ação e tipo de ocorrência." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Field label="Filial">
            <Select value={filters.branchId || ""} onChange={(event) => setFilters({ ...filters, branchId: event.target.value })}>
              <option value="">Todas</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Funcionário">
            <Select value={filters.employeeId || ""} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}>
              <option value="">Todos</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Início">
            <Input type="date" value={filters.startDate || ""} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
          </Field>
          <Field label="Fim">
            <Input type="date" value={filters.endDate || ""} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={filters.status || ""} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ocorrência">
            <Select value={filters.occurrenceType || ""} onChange={(event) => setFilters({ ...filters, occurrenceType: event.target.value })}>
              <option value="">Todas</option>
              <option value="late">Atraso</option>
              <option value="early_leave">Saída antecipada</option>
              <option value="outside_radius">Fora do raio</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Button onClick={load} disabled={loading}>
            Aplicar filtros
          </Button>
        </div>
      </Card>
      {message ? <p className="mb-3 rounded-lg bg-emerald-50 p-3 font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="mb-3 rounded-lg bg-red-50 p-3 font-bold text-red-800">{error}</p> : null}
      {selected ? (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <h2 className="mb-3 font-black text-amber-950">Ajuste manual auditado</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Data/hora">
              <Input value={adjustment.entry_timestamp || ""} type="datetime-local" onChange={(event) => setAdjustment({ ...adjustment, entry_timestamp: event.target.value })} />
            </Field>
            <Field label="Ação">
              <Select value={adjustment.action || ""} onChange={(event) => setAdjustment({ ...adjustment, action: event.target.value })}>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={adjustment.status || "adjusted"} onChange={(event) => setAdjustment({ ...adjustment, status: event.target.value })}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Atraso (min)">
              <Input type="number" value={adjustment.late_minutes || 0} onChange={(event) => setAdjustment({ ...adjustment, late_minutes: event.target.value })} />
            </Field>
            <Field label="Saída antecipada (min)">
              <Input type="number" value={adjustment.early_leave_minutes || 0} onChange={(event) => setAdjustment({ ...adjustment, early_leave_minutes: event.target.value })} />
            </Field>
            <Field label="Motivo do ajuste">
              <Textarea value={adjustment.adjustment_reason || ""} onChange={(event) => setAdjustment({ ...adjustment, adjustment_reason: event.target.value })} />
            </Field>
          </div>
          <div className="admin-action-row mt-4 mobile-stack-actions">
            <Button disabled={loading || !adjustment.adjustment_reason} onClick={saveAdjustment}>
              <Save className="h-4 w-4" />
              Salvar ajuste
            </Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : null}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="p-3">Funcionário</th>
                <th className="p-3">Filial</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Data/Hora</th>
                <th className="p-3">Status</th>
                <th className="p-3">Distância</th>
                <th className="p-3">Atraso</th>
                <th className="p-3">Saída ant.</th>
                <th className="p-3">Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100">
                  <td className="p-3 font-bold">{entry.employees?.full_name}</td>
                  <td className="p-3">{entry.branches?.name}</td>
                  <td className="p-3">{actionLabels[entry.action as TimeAction]}</td>
                  <td className="p-3">{formatDateTime(entry.entry_timestamp)}</td>
                  <td className="p-3">
                    <Badge tone={entry.status === "valid" ? "green" : entry.status === "blocked" ? "red" : "yellow"}>
                      {statusLabels[entry.status as TimeEntryStatus]}
                    </Badge>
                  </td>
                  <td className="p-3">{entry.distance_meters ? `${entry.distance_meters}m` : "-"}</td>
                  <td className="p-3">{minutesToHourText(entry.late_minutes)}</td>
                  <td className="p-3">{minutesToHourText(entry.early_leave_minutes)}</td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" onClick={() => choose(entry)}>
                      Ajustar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
