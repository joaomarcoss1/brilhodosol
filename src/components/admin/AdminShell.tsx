"use client";

import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Repeat,
  Settings,
  Shield,
  TimerReset,
  UserCheck,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import {
  createBrowserSupabaseClient,
  getBrowserAdminSession,
  getBrowserSupabaseConfigStatus,
} from "@/lib/client/supabase";
import { clsx } from "clsx";

const nav = [
  {
    href: "/admin",
    label: "Início",
    icon: Gauge,
    group: "inicio",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/funcionarios",
    label: "Funcionários",
    icon: Users,
    group: "equipe",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/funcionarios/importar",
    label: "Importar",
    icon: FileSpreadsheet,
    group: "mais",
    roles: ["master_admin", "admin", "admin_geral", "rh_financeiro"],
  },
  {
    href: "/admin/gerencia-filial",
    label: "Gerência",
    icon: UserCheck,
    group: "equipe",
    roles: ["master_admin", "admin", "admin_geral", "gerente_filial"],
  },
  {
    href: "/admin/filiais",
    label: "Filiais",
    icon: Building2,
    group: "mais",
    roles: ["master_admin", "admin", "admin_geral"],
  },
  {
    href: "/admin/horarios",
    label: "Escalas",
    icon: CalendarDays,
    group: "equipe",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/pontos",
    label: "Pontos",
    icon: ClipboardCheck,
    group: "ponto",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/revisoes-ponto",
    label: "Revisões",
    icon: Shield,
    group: "ponto",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/horas-extras",
    label: "Horas extras",
    icon: TimerReset,
    group: "ponto",
    roles: ["master_admin", "admin", "admin_geral", "rh_financeiro"],
  },
  {
    href: "/admin/inconsistencias",
    label: "Inconsistências",
    icon: Shield,
    group: "ponto",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/justificativas",
    label: "Justificativas",
    icon: FileSpreadsheet,
    group: "ponto",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/folha",
    label: "Folha",
    icon: WalletCards,
    group: "folha",
    roles: ["master_admin", "admin", "admin_geral", "rh_financeiro"],
  },
  {
    href: "/admin/fechamento",
    label: "Fechamento",
    icon: ClipboardList,
    group: "folha",
    roles: ["master_admin", "admin", "admin_geral", "rh_financeiro"],
  },
  {
    href: "/admin/banco-de-horas",
    label: "Banco de horas",
    icon: TimerReset,
    group: "mais",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/solicitacoes",
    label: "Solicitações",
    icon: Repeat,
    group: "mais",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
    icon: FileSpreadsheet,
    group: "mais",
    roles: [
      "master_admin",
      "admin",
      "admin_geral",
      "rh_financeiro",
      "gerente_filial",
    ],
  },
  {
    href: "/admin/configuracoes",
    label: "Configurações",
    icon: Settings,
    group: "mais",
    roles: ["master_admin", "admin", "admin_geral"],
  },
  {
    href: "/admin/administradores",
    label: "Admins",
    icon: UserCog,
    group: "mais",
    roles: ["master_admin"],
  },
  {
    href: "/admin/auditoria",
    label: "Auditoria",
    icon: Shield,
    group: "mais",
    roles: ["master_admin", "admin_geral"],
  },
];

type Profile = {
  role?: string;
  name?: string;
  email?: string;
  canViewFinancialData?: boolean;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<
    "checking" | "ready" | "redirecting"
  >("checking");
  const [authMessage, setAuthMessage] = useState(
    "Validando sessão administrativa...",
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const profileKey = "bs_admin_profile";
    const cachedAtKey = "bs_admin_profile_cached_at";
    const cacheTtlMs = 5 * 60_000;

    const cachedProfile = typeof window !== "undefined"
      ? window.sessionStorage.getItem(profileKey)
      : null;
    const cachedAt = typeof window !== "undefined"
      ? Number(window.sessionStorage.getItem(cachedAtKey) || 0)
      : 0;
    let hasValidCachedProfile = false;

    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile));
        setAuthState("ready");
        setAuthMessage("Sessão administrativa carregada.");
        hasValidCachedProfile = true;
      } catch {
        window.sessionStorage.removeItem(profileKey);
        window.sessionStorage.removeItem(cachedAtKey);
      }
    }
    const cacheIsFresh = Boolean(hasValidCachedProfile && cachedAt && Date.now() - cachedAt < cacheTtlMs);

    async function validateSession() {
      const config = getBrowserSupabaseConfigStatus();
      if (!config.configured) {
        if (!active) return;
        setAuthMessage(config.message);
        setAuthState("redirecting");
        router.replace("/admin/login");
        return;
      }

      try {
        const { data } = await getBrowserAdminSession();
        if (!active) return;
        if (!data.session) {
          window.sessionStorage.removeItem(profileKey);
          window.sessionStorage.removeItem(cachedAtKey);
          setAuthMessage("Sessão administrativa não encontrada. Redirecionando para o login...");
          setAuthState("redirecting");
          router.replace("/admin/login");
          return;
        }

        if (cacheIsFresh) return;

        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Não foi possível validar o perfil administrativo.");
        }

        const payload = await response.json();
        const adminProfile = payload.admin || null;
        if (!active) return;
        setProfile(adminProfile);
        if (adminProfile) {
          window.sessionStorage.setItem(profileKey, JSON.stringify(adminProfile));
          window.sessionStorage.setItem(cachedAtKey, String(Date.now()));
        }
        setAuthState("ready");
      } catch (error) {
        if (!active) return;
        if (cachedProfile) {
          setAuthState("ready");
          setAuthMessage("Usando a sessão em cache enquanto a conexão estabiliza.");
          return;
        }
        setAuthMessage(error instanceof Error ? error.message : "Não foi possível validar a sessão administrativa.");
        setAuthState("redirecting");
        router.replace("/admin/login");
      }
    }

    validateSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function signOut() {
    window.sessionStorage.removeItem("bs_admin_profile");
    window.sessionStorage.removeItem("bs_admin_profile_cached_at");
    await createBrowserSupabaseClient().auth.signOut();
    router.replace("/admin/login");
  }

  const visibleNav = useMemo(() => {
    const role = profile?.role || "master_admin";
    return nav.filter((item) => item.roles.includes(role));
  }, [profile?.role]);

  const bottomItems = [
    { href: "/admin", label: "Início", icon: Home },
    { href: "/admin/funcionarios", label: "Equipe", icon: Users },
    { href: "/admin/pontos", label: "Ponto", icon: ClipboardCheck },
    { href: "/admin/folha", label: "Folha", icon: WalletCards },
  ].filter((item) => visibleNav.some((navItem) => navItem.href === item.href));
  const moreItems = visibleNav.filter(
    (item) => !bottomItems.some((bottom) => bottom.href === item.href),
  );

  if (authState !== "ready") {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-50/60 p-4">
        <div className="grid max-w-md gap-4 rounded-3xl bg-white p-6 text-center shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
          <BrandMark />
          <span className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" />
          <p className="text-sm font-semibold text-slate-600">{authMessage}</p>
          {authState === "redirecting" ? (
            <Link
              className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white"
              href="/admin/login"
            >
              Ir para login administrativo
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(7,141,58,0.10),transparent_340px),linear-gradient(180deg,#f7faf7,#f8fafc)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-brand-100 bg-white/95 p-4 shadow-[18px_0_60px_rgba(15,23,42,0.04)] backdrop-blur lg:flex lg:flex-col">
        <BrandMark compact />
        <div className="mt-4 rounded-3xl border border-brand-100 bg-brand-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-700">
            Perfil
          </p>
          <p className="truncate text-sm font-black text-brand-950">
            {profile?.name || profile?.email || "Administrador"}
          </p>
          <p className="text-xs font-semibold text-brand-700">
            {profile?.role || "master_admin"}
          </p>
        </div>
        <nav className="mt-4 grid flex-1 content-start gap-1 overflow-y-auto pr-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={clsx(
                  "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-extrabold leading-tight transition-all",
                  active
                    ? "bg-brand-600 text-white shadow-[0_14px_30px_rgba(7,141,58,0.18)]"
                    : "text-slate-700 hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-800",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <Button className="mt-4 w-full" variant="ghost" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </aside>
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/95 px-3 py-2 shadow-[0_10px_40px_rgba(15,23,42,0.05)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <BrandMark compact />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMoreOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={signOut}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="p-3 pb-24 lg:ml-72 lg:p-8">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 px-2 py-2 shadow-[0_-18px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={clsx(
                  "grid min-h-[56px] place-items-center rounded-2xl px-1 py-1 text-[10px] font-black leading-tight",
                  active
                    ? "bg-brand-600 text-white shadow-[0_12px_24px_rgba(7,141,58,0.18)]"
                    : "text-slate-600",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="grid min-h-[56px] place-items-center rounded-2xl px-1 py-1 text-[10px] font-black leading-tight text-slate-600"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[2rem] bg-white p-4 shadow-[0_-22px_80px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                  Menu
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  Mais opções
                </h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMoreOpen(false)}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800"
                  >
                    <Icon className="mb-3 h-5 w-5 text-brand-700" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
