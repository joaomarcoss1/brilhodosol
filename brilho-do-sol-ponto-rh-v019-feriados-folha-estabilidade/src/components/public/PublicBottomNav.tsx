"use client";

import { ClipboardEdit, Clock3, History } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const items = [
  { href: "/", label: "Ponto", icon: Clock3 },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/justificativa", label: "Justificar", icon: ClipboardEdit }
];

export function PublicBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[11px] font-black leading-tight transition",
                active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
