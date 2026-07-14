"use client";

import { ArrowLeft, KeyRound, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createBrowserSupabaseClient, getBrowserSupabaseConfigStatus } from "@/lib/client/supabase";

export function AdminLogin() {
  const router = useRouter();
  const supabaseConfig = getBrowserSupabaseConfigStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!supabaseConfig.configured) throw new Error(supabaseConfig.message);

      const supabase = createBrowserSupabaseClient();

      const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError || !data.session) throw new Error(signError?.message || "Login inválido.");

      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7f6] lg:grid lg:grid-cols-[1fr_520px]">
      <section className="relative hidden bg-brand-800 p-10 text-white lg:block">
        <div className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-brand-500/60" />
        <div className="absolute -bottom-44 -left-20 h-80 w-[120%] rounded-[50%] bg-[#f5f7f6]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <BrandMark inverse />
          <div className="max-w-lg pb-24">
            <p className="mb-3 inline-flex rounded-full bg-white/12 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-sun-100">
              Painel administrativo
            </p>
            <h1 className="text-5xl font-black leading-tight">Ponto, RH e folha em um painel profissional.</h1>
            <p className="mt-5 text-lg font-medium leading-8 text-emerald-50">
              Gerencie filiais, funcionários, revisões, folha de pagamento e relatórios premium com a identidade do Brilho do Sol.
            </p>
          </div>
        </div>
      </section>

      <section className="relative grid min-h-screen place-items-center px-4 py-8">
        <div className="absolute inset-x-0 top-0 h-72 bg-brand-700 lg:hidden">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-500/60" />
          <div className="absolute -bottom-24 left-0 h-48 w-[130%] rounded-[50%] bg-[#f5f7f6]" />
        </div>

        <div className="relative z-10 grid w-full max-w-md gap-5">
          <div className="pt-4 lg:hidden">
            <BrandMark inverse />
          </div>
          <section className="rounded-[30px] bg-white p-6 shadow-[0_24px_80px_rgba(6,67,32,0.18)]">
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">Área administrativa</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Acesso Administrativo</h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">Entre para gerenciar ponto, RH e folha.</p>
            </div>
            <div className="grid gap-4">
              {!supabaseConfig.configured ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{supabaseConfig.message}</p>
              ) : null}
              <Field label="E-mail">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@empresa.com" className="rounded-2xl pl-12" />
                </div>
              </Field>
              <Field label="Senha">
                <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" className="rounded-2xl" />
              </Field>
              <Button onClick={login} disabled={loading || !email || !password || !supabaseConfig.configured} size="lg" className="w-full rounded-2xl">
                <LockKeyhole className="h-5 w-5" />
                Entrar
              </Button>
              <Link href="/admin/recuperar-senha" className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-center text-sm font-black text-brand-800 transition hover:bg-brand-100">
                Esqueci minha senha
              </Link>
              <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-sm font-black text-slate-600 transition hover:bg-slate-50 hover:text-brand-800">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o ponto
              </Link>
            </div>
            {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
            {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              <KeyRound className="mt-0.5 h-4 w-4 text-brand-700" />
              <span>Funcionários não usam esta área. A configuração inicial do master fica em uma rota separada e é bloqueada após a ativação.</span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
