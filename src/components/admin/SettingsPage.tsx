"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { adminFetch } from "@/lib/client/admin-api";

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<any>("/api/admin/settings")
      .then((data) => setSettings(data.settings || {}))
      .catch((err) => setError(err.message));
  }, []);

  function setValue(key: string, value: unknown) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    try {
      const payload = {
        ...settings,
        late_tolerance_minutes: Number(settings.late_tolerance_minutes || 15),
        early_leave_tolerance_minutes: Number(settings.early_leave_tolerance_minutes || 15),
        default_radius_meters: Number(settings.default_radius_meters || 900),
        max_gps_accuracy_meters: Number(settings.max_gps_accuracy_meters || 100),
        overtime_multiplier: Number(settings.overtime_multiplier || 1.5)
      };
      const data = await adminFetch<any>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setSettings(data.settings);
      setMessage("Configurações salvas.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    }
  }

  return (
    <AdminShell>
      <SectionTitle title="Configurações gerais" description="Regras centrais usadas no ponto, cálculos de folha e relatórios." />
      {message ? <p className="mb-3 rounded-lg bg-emerald-50 p-3 font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="mb-3 rounded-lg bg-red-50 p-3 font-bold text-red-800">{error}</p> : null}
      <Card>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <Field label="Tolerância de atraso (min)">
            <Input type="number" value={settings.late_tolerance_minutes || 15} onChange={(event) => setValue("late_tolerance_minutes", event.target.value)} />
          </Field>
          <Field label="Tolerância de saída antecipada (min)">
            <Input type="number" value={settings.early_leave_tolerance_minutes || 15} onChange={(event) => setValue("early_leave_tolerance_minutes", event.target.value)} />
          </Field>
          <Field label="Raio padrão de geolocalização (m)">
            <Input type="number" value={settings.default_radius_meters || 900} onChange={(event) => setValue("default_radius_meters", event.target.value)} />
          </Field>

          <Field label="Precisão máxima do GPS (m)">
            <Input type="number" value={settings.max_gps_accuracy_meters || 100} onChange={(event) => setValue("max_gps_accuracy_meters", event.target.value)} />
          </Field>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={Boolean(settings.require_review_on_poor_gps_accuracy ?? true)}
              onChange={(event) => setValue("require_review_on_poor_gps_accuracy", event.target.checked)}
            />
            Enviar GPS impreciso para revisão
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={Boolean(settings.allow_different_branch_with_authorization ?? true)}
              onChange={(event) => setValue("allow_different_branch_with_authorization", event.target.checked)}
            />
            Permitir filial diferente com autorização
          </label>
          <Field label="Multiplicador de hora extra">
            <Input type="number" step="0.1" value={settings.overtime_multiplier || 1.5} onChange={(event) => setValue("overtime_multiplier", event.target.value)} />
          </Field>
          <Field label="Forma de cálculo da diária">
            <Select value={settings.daily_rate_calculation || "expected_work_days"} onChange={(event) => setValue("daily_rate_calculation", event.target.value)}>
              <option value="expected_work_days">Dias previstos no período</option>
              <option value="business_days">Dias úteis</option>
              <option value="fixed_30">Salário / 30</option>
            </Select>
          </Field>
          <Field label="Cor principal">
            <Input type="color" value={settings.primary_color || "#078d3a"} onChange={(event) => setValue("primary_color", event.target.value)} />
          </Field>
          <Field label="Cor secundária">
            <Input type="color" value={settings.secondary_color || "#ffc107"} onChange={(event) => setValue("secondary_color", event.target.value)} />
          </Field>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={Boolean(settings.allow_outside_radius_review)}
              onChange={(event) => setValue("allow_outside_radius_review", event.target.checked)}
            />
            Permitir ponto fora do raio mediante revisão
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={Boolean(settings.auto_approve_overtime)}
              onChange={(event) => setValue("auto_approve_overtime", event.target.checked)}
            />
            Aprovar hora extra automaticamente
          </label>
          <Field label="Nome da empresa">
            <Input value={settings.company_name || ""} onChange={(event) => setValue("company_name", event.target.value)} />
          </Field>
          <Field label="Documento da empresa">
            <Input value={settings.company_document || ""} onChange={(event) => setValue("company_document", event.target.value)} />
          </Field>
          <Field label="Endereço da empresa">
            <Input value={settings.company_address || ""} onChange={(event) => setValue("company_address", event.target.value)} />
          </Field>
          <Field label="Rodapé dos relatórios">
            <Textarea value={settings.report_footer || ""} onChange={(event) => setValue("report_footer", event.target.value)} />
          </Field>
        </div>
        <div className="mt-5">
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Salvar configurações
          </Button>
        </div>
      </Card>
    </AdminShell>
  );
}
