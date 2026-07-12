"use client";

import { Building2, Edit3, MapPinned, Plus, QrCode, RefreshCw, Save, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BranchMapEditor } from "@/components/admin/BranchMapEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { adminFetch, downloadAdminFile } from "@/lib/client/admin-api";

const emptyForm = {
  name: "",
  type: "filial",
  address: "",
  latitude: "",
  longitude: "",
  allowed_radius_meters: 900,
  google_maps_url: "",
  map_place_id: "",
  geofence_enabled: true,
  active: true
};

export function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>(emptyForm);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<any | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await adminFetch<any>(`/api/admin/branches${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      setBranches(data.branches || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar filiais.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => branches, [branches]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function startEdit(branch: any) {
    setEditing(branch);
    setForm({ ...emptyForm, ...branch });
    setShowForm(true);
    setMessage("");
    setError("");
  }

  async function save() {
    try {
      setLoading(true);
      setError("");
      const payload = {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        allowed_radius_meters: Number(form.allowed_radius_meters || 900),
        id: editing?.id
      };
      await adminFetch("/api/admin/branches", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setMessage(editing ? "Filial atualizada com geolocalização." : "Filial cadastrada com geolocalização.");
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar filial.");
    } finally {
      setLoading(false);
    }
  }


  async function generateQr(branch: any) {
    try {
      await adminFetch("/api/admin/branch-qr", { method: "POST", body: JSON.stringify({ branch_id: branch.id }) });
      setMessage("QR da filial gerado. Agora você pode baixar o PDF para impressão.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar QR da filial.");
    }
  }

  async function downloadQr(branch: any) {
    try {
      await downloadAdminFile(`/api/admin/branch-qr?branchId=${branch.id}&format=pdf`, `qr-${branch.name}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar QR da filial.");
    }
  }

  async function deactivate(branch: any) {
    try {
      await adminFetch(`/api/admin/branches?id=${branch.id}`, { method: "DELETE" });
      setMessage("Filial desativada.");
      setDeactivateTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar filial.");
    }
  }

  return (
    <AdminShell>
      <SectionTitle title="Gestão de filiais" description="Configure matriz e filiais com Google Maps, raio de 900m, geofence e validação real para o ponto mobile." />
      {message ? <p className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar filial" />
          <Button variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nova unidade</Button>
      </div>

      {showForm ? (
        <Card className="mb-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">{editing ? "Editar unidade" : "Nova unidade"}</h2>
              <p className="text-sm font-semibold text-slate-600">Marque o ponto central no mapa. O raio de 900m será validado a partir desse marcador.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /> Fechar</Button>
          </div>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid content-start gap-3">
              <Field label="Nome da unidade"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Tipo"><Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="matriz">Matriz/Sede</option><option value="filial">Filial</option></Select></Field>
              <Field label="Endereço"><Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
              <Field label="Link Google Maps"><Input value={form.google_maps_url || ""} onChange={(event) => setForm({ ...form, google_maps_url: event.target.value })} placeholder="https://www.google.com/maps?q=..." /></Field>
              <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold leading-tight">
                <input type="checkbox" checked={Boolean(form.geofence_enabled)} onChange={(event) => setForm({ ...form, geofence_enabled: event.target.checked })} />
                Geofence ativa para validar ponto
              </label>
              <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold leading-tight">
                <input type="checkbox" checked={Boolean(form.active)} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                Unidade ativa
              </label>
              <Button disabled={loading} onClick={save}><Save className="h-4 w-4" /> Salvar unidade</Button>
            </div>
            <BranchMapEditor value={form} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="admin-table-shell">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-brand-700 text-xs uppercase text-white">
              <tr>
                <th className="p-3">Unidade</th><th className="p-3">Tipo</th><th className="p-3">Endereço</th><th className="p-3">Geolocalização</th><th className="p-3">Raio</th><th className="p-3">Funcionários</th><th className="p-3">Status</th><th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((branch) => (
                <tr key={branch.id} className="border-b border-slate-100 odd:bg-white even:bg-brand-50/40 transition hover:bg-sun-50/60">
                  <td className="max-w-[220px] p-3 font-black text-slate-950"><span className="inline-flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-brand-700" /><span className="text-safe">{branch.name}</span></span></td>
                  <td className="p-3"><Badge tone={branch.type === "matriz" ? "blue" : "green"}>{branch.type === "matriz" ? "Matriz" : "Filial"}</Badge></td>
                  <td className="max-w-[280px] p-3 text-slate-600">{branch.address}</td>
                  <td className="p-3"><span className="grid gap-1"><strong>{Number(branch.latitude).toFixed(5)}, {Number(branch.longitude).toFixed(5)}</strong><span className="text-xs text-slate-500">{branch.geofence_enabled ? "Geofence ativa" : "Geofence desativada"}</span><Badge tone={branch.gps_ready || branch.geolocation_status === "confirmed" ? "green" : "yellow"}>{branch.gps_ready || branch.geolocation_status === "confirmed" ? "GPS confirmado" : "GPS pendente"}</Badge></span></td>
                  <td className="p-3 font-bold">{branch.allowed_radius_meters || 900}m</td>
                  <td className="p-3">{branch.employee_count ?? 0}</td>
                  <td className="p-3"><Badge tone={branch.active ? "green" : "red"}>{branch.active ? "Ativa" : "Inativa"}</Badge></td>
                  <td className="p-3"><div className="admin-action-row"><Button size="sm" variant="ghost" onClick={() => startEdit(branch)}><Edit3 className="h-4 w-4" /> Editar</Button>{branch.google_maps_url ? <a href={branch.google_maps_url} target="_blank" rel="noreferrer" className="btn-safe inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-extrabold leading-tight text-slate-700 shadow-sm transition hover:bg-brand-50"><MapPinned className="h-4 w-4 shrink-0" /> Mapa</a> : null}<Button size="sm" variant="ghost" onClick={() => generateQr(branch)}><QrCode className="h-4 w-4" /> Gerar QR</Button><Button size="sm" variant="ghost" onClick={() => downloadQr(branch)}><QrCode className="h-4 w-4" /> PDF QR</Button>{branch.active ? <Button size="sm" variant="danger" onClick={() => setDeactivateTarget(branch)}>Desativar</Button> : null}</div></td>
                </tr>
              ))}
              {!filtered.length ? <tr><td className="p-10 text-center text-slate-500" colSpan={8}>Nenhuma unidade encontrada.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm font-semibold text-brand-900">
          <ShieldCheck className="mr-2 inline h-4 w-4" /> A validação do ponto usa latitude/longitude, raio configurado, distância calculada e precisão do GPS registrada em cada batida.
        </div>
      </Card>

      {deactivateTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-[0_32px_100px_rgba(0,0,0,0.24)]">
            <h2 className="text-xl font-black text-slate-950">Desativar unidade?</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">{deactivateTarget.name} ficará inativa para novos cadastros e validações futuras.</p>
            <div className="admin-action-row mt-4 justify-end mobile-stack-actions">
              <Button variant="ghost" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => deactivate(deactivateTarget)}>Desativar</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
