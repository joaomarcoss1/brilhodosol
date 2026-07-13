import Image from "next/image";
import { clsx } from "clsx";

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src="/logo-brilho-do-sol.jpeg"
        alt="Brilho do Sol Supermercado"
        width={compact ? 46 : 64}
        height={compact ? 46 : 64}
        className="shrink-0 rounded-full border-2 border-white object-cover shadow-md"
        priority
      />
      <div className="min-w-0 leading-none">
        <p className={clsx("truncate text-base font-black leading-tight", inverse ? "text-white" : "text-brand-900")}>Brilho do Sol</p>
        <p className={clsx("truncate text-[11px] font-bold uppercase tracking-[0.14em]", inverse ? "text-sun-100" : "text-sun-500")}>Supermercado</p>
      </div>
    </div>
  );
}
