import { Star } from "lucide-react";

export default function XpBadge({ xp }: { xp: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-xp/10 px-4 py-2 text-xp dark:bg-xp/20">
      <Star size={20} fill="currentColor" />
      <span className="font-heading text-lg font-bold">{xp} XP</span>
    </div>
  );
}
