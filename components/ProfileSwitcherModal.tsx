"use client";

import { useState } from "react";
import { Rocket, Sparkles, Plus, Loader2 } from "lucide-react";
import type { Profile, Grade } from "@/lib/db";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const GRADE_OPTIONS: { grade: Grade; label: string; blurb: string; icon: typeof Rocket }[] = [
  { grade: "Grade 3 CBSE", label: "Grade 3 Explorer", blurb: "Fun quizzes & big adventures!", icon: Rocket },
  { grade: "Grade 6 IGCSE", label: "Grade 6 Challenger", blurb: "Level up your thinking skills.", icon: Sparkles },
];

export default function ProfileSwitcherModal({
  profiles,
  onSelect,
  onCreate,
}: {
  profiles: Profile[];
  onSelect: (profileId: string) => void;
  onCreate: (input: { name: string; grade: Grade }) => Promise<void>;
}) {
  const [creating, setCreating] = useState(profiles.length === 0);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !grade) return;
    setSaving(true);
    await onCreate({ name: name.trim(), grade });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <Card className="w-full max-w-lg">
        {!creating ? (
          <>
            <h2 className="font-heading text-2xl font-bold text-foreground">Who&apos;s learning today?</h2>
            <div className="mt-4 grid gap-3">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="flex min-h-[64px] items-center justify-between rounded-2xl border-2 border-line px-5 py-3 text-left transition hover:border-brand active:scale-[0.98]"
                >
                  <div>
                    <p className="font-heading text-lg font-semibold text-foreground">{p.name}</p>
                    <p className="text-sm text-muted">{p.grade}</p>
                  </div>
                  <span className="rounded-full bg-xp/10 px-3 py-1 text-sm font-semibold text-xp dark:bg-xp/20">
                    {p.xp_points} XP
                  </span>
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-4 flex w-full items-center justify-center gap-2" onClick={() => setCreating(true)}>
              <Plus size={20} /> Add a profile
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-heading text-2xl font-bold text-foreground">Let&apos;s set you up!</h2>
            <label className="mt-4 block text-sm font-semibold text-muted" htmlFor="kid-name">
              What&apos;s your name?
            </label>
            <input
              id="kid-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name"
              className="mt-1 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-background px-4 text-lg text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <p className="mt-5 text-sm font-semibold text-muted">Pick your grade</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GRADE_OPTIONS.map(({ grade: g, label, blurb, icon: Icon }) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-4 py-4 text-center transition active:scale-[0.98] ${
                    grade === g ? "border-brand bg-brand-light/10" : "border-line hover:border-line-strong"
                  }`}
                >
                  <Icon className="text-brand" size={28} />
                  <span className="font-heading font-semibold text-foreground">{label}</span>
                  <span className="text-xs text-muted">{blurb}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              {profiles.length > 0 && (
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  Back
                </Button>
              )}
              <Button
                className="flex flex-1 items-center justify-center gap-2"
                disabled={!name.trim() || !grade || saving}
                onClick={handleCreate}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : "Start learning!"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
