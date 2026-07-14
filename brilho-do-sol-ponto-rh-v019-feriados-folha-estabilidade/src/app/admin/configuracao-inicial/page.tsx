"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ToastMessage } from "@/components/ui/feedback";

export default function Page() {
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [form, setForm] = useState({ email: "", password: "", setupToken: "", name: "" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/admin/bootstrap-master", { cache: "no-store" }).then((r) => r.json()).then((d) => { setAvailable(Boolean(d.setupAvailable)); if (!d.setupAvailable) setTimeout(() => router.replace("/admin/login"), 1200); }).catch(() => setAvailable(false)); }, [router]);
  async function submit() { setLoading(true); setError(""); try { const response = await fetch("/api/admin/bootstrap-master", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Falha na ativação."); router.replace("/admin/login"); } catch (err) { setError(err instanceof Error ? err.message : "Falha na ativação."); } finally { setLoading(false); } }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><section className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-xl"><BrandMark /><h1 className="mt-6 text-2xl font-black">Configuração inicial</h1><p className="mt-2 text-sm font-semibold text-slate-600">Disponível somente quando ainda não existe um master ativo.</p>{available === false ? <ToastMessage type="warning">A configuração inicial está bloqueada. Redirecionando ao login.</ToastMessage> : null}{error ? <ToastMessage type="error">{error}</ToastMessage> : null}{available ? <div className="mt-5 grid gap-3"><Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Senha administrativa"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><span className="text-xs font-semibold text-slate-500">Use no mínimo 10 caracteres, com letra e número. Esta regra é apenas para administradores e não altera os PINs dos funcionários.</span></Field><Field label="Token de configuração"><Input type="password" value={form.setupToken} onChange={(e) => setForm({ ...form, setupToken: e.target.value })} /></Field><Button loading={loading} onClick={submit}>Ativar administrador master</Button></div> : null}<Link className="mt-4 block text-center text-sm font-black text-brand-700" href="/admin/login">Voltar ao login</Link></section></main>;
}
