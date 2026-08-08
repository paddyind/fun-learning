import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

const variants: Record<string, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-surface text-brand border-2 border-brand hover:bg-brand-light/10",
  ghost: "bg-transparent text-muted hover:bg-line",
};

export default function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "min-h-[56px] rounded-2xl px-6 py-3 text-lg font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
