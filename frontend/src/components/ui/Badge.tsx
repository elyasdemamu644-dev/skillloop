import type { HTMLAttributes } from "react";

type Tone = "brand" | "success" | "warning" | "danger" | "slate";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONES: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

export default function Badge({ tone = "brand", className = "", children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}