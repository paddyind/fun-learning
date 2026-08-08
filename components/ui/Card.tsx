import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-3xl bg-surface p-5 text-foreground shadow-md ring-1 ring-line", className)}
      {...props}
    />
  );
}
