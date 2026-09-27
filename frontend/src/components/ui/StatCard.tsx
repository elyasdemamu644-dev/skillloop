import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  sub?: string;
  accent?: "brand" | "accent" | "success";
}

const ACCENTS = {
  brand: "from-brand-500 to-brand-600",
  accent: "from-accent-500 to-accent-600",
  success: "from-emerald-500 to-emerald-600",
};

export default function StatCard({ label, value, icon, sub, accent = "brand" }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br blur-2xl opacity-20 ${ACCENTS[accent]}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>}
      </div>
    </div>
  );
}