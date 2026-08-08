import { Flame } from "lucide-react";

export default function StreakFlame({ days }: { days: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-streak/10 px-4 py-2 text-streak dark:bg-streak/20">
      <Flame size={20} fill="currentColor" />
      <span className="font-heading text-lg font-bold">{days}-day streak</span>
    </div>
  );
}
