import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export default function Card({ interactive = false, className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white shadow-soft ring-1 ring-slate-900/5 transition ${
        interactive
          ? "hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}