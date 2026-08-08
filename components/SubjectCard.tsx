import Link from "next/link";
import { Upload, Swords, ClipboardCheck } from "lucide-react";
import type { Subject } from "@/lib/db";
import { getSubjectIcon } from "@/lib/icons";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

export default function SubjectCard({ subject, progress }: { subject: Subject; progress: number }) {
  const Icon = getSubjectIcon(subject.icon);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light/15 text-brand">
          <Icon size={26} />
        </div>
        <h3 className="font-heading text-xl font-bold text-foreground">{subject.name}</h3>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <Link
          href={`/dashboard/upload?subject=${subject.id}`}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-surface-muted p-2 text-muted ring-1 ring-line transition hover:bg-line active:scale-95"
        >
          <Upload size={20} />
          Upload Notes
        </Link>
        <Link
          href={`/dashboard/quiz?subject=${subject.id}`}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-brand-light/10 p-2 text-brand transition hover:bg-brand-light/20 active:scale-95"
        >
          <Swords size={20} />
          Take Challenge
        </Link>
        <Link
          href={`/dashboard/revision?subject=${subject.id}`}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-surface-muted p-2 text-muted ring-1 ring-line transition hover:bg-line active:scale-95"
        >
          <ClipboardCheck size={20} />
          Quarterly Review
        </Link>
      </div>
    </Card>
  );
}
