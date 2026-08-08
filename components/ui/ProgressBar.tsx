import { clsx } from "@/lib/clsx";

export default function ProgressBar({ value, colorClassName = "bg-brand" }: { value: number; colorClassName?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={clsx("h-full rounded-full transition-all duration-300 ease-out", colorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
