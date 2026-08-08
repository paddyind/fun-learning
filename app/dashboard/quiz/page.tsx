"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, PartyPopper } from "lucide-react";
import { useActiveProfile } from "@/lib/useActiveProfile";
import { listSubjects, createQuizResult, addProfileXp, setProfileStreak, type Subject } from "@/lib/db";
import type { QuizQuestion } from "@/lib/gemini";
import QuizQuestionCard from "@/components/QuizQuestionCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const XP_PER_CORRECT = 10;
const PERFECT_BONUS = 20;
const STREAK_KEY_PREFIX = "streakDate:";

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <QuizPageInner />
    </Suspense>
  );
}

function QuizPageInner() {
  const { activeProfile, refreshActiveProfile } = useActiveProfile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subjectId = searchParams.get("subject") ?? "";
  const materialId = searchParams.get("material") ?? undefined;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ topic: string; correct: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile || !subjectId) return;
    listSubjects(activeProfile.id).then((list) => setSubject(list.find((s) => s.id === subjectId) ?? null));
  }, [activeProfile, subjectId]);

  useEffect(() => {
    if (!activeProfile || !subjectId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: subjectId, profile_id: activeProfile.id, material_id: materialId }),
      });
      if (cancelled) return;
      if (!res.ok) {
        setError("Couldn't create a quiz right now. Please try again.");
        return;
      }
      const data = await res.json();
      if (!cancelled) setQuestions(data.questions);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, subjectId, materialId]);

  const handleAnswered = (correct: boolean) => {
    if (!questions) return;
    setAnswers((prev) => [...prev, { topic: questions[index].topic, correct }]);
  };

  const handleNext = async () => {
    if (!questions) return;
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      return;
    }

    setFinished(true);
    if (!activeProfile) return;
    setSaving(true);
    setSaveError(null);

    try {
      const correctCount = answers.filter((a) => a.correct).length;
      const weakConcepts = Array.from(new Set(answers.filter((a) => !a.correct).map((a) => a.topic)));
      const xpEarned = correctCount * XP_PER_CORRECT + (correctCount === questions.length ? PERFECT_BONUS : 0);

      await createQuizResult({
        profile_id: activeProfile.id,
        subject_id: subjectId,
        topic: subject?.name ?? "General",
        score: correctCount,
        total_questions: questions.length,
        weak_concepts: weakConcepts,
      });
      await addProfileXp(activeProfile.id, xpEarned);

      const streakKey = `${STREAK_KEY_PREFIX}${activeProfile.id}`;
      const today = new Date().toDateString();
      if (typeof window !== "undefined" && window.localStorage.getItem(streakKey) !== today) {
        await setProfileStreak(activeProfile.id, activeProfile.streak_days + 1);
        window.localStorage.setItem(streakKey, today);
      }

      await refreshActiveProfile();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your progress.");
    } finally {
      setSaving(false);
    }
  };

  if (!activeProfile) return null;

  if (error) {
    return (
      <main className="mx-auto max-w-xl">
        <Card>
          <p className="text-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </Card>
      </main>
    );
  }

  if (!questions) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="font-heading text-lg font-semibold">Cooking up your quiz...</p>
      </main>
    );
  }

  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    return (
      <main className="mx-auto max-w-xl">
        <Card className="text-center">
          <PartyPopper className="mx-auto text-brand" size={40} />
          <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">
            You scored {correctCount} / {questions.length}!
          </h1>
          <p className="mt-1 text-muted">
            {saving ? "Saving your progress..." : saveError ? saveError : "Progress saved! Keep it up!"}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => window.location.reload()}>
              Try another challenge
            </Button>
            <Button className="flex-1" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">{subject?.name ?? "Challenge"} Challenge</h1>
      <div className="mt-5">
        <QuizQuestionCard
          key={index}
          question={questions[index]}
          index={index}
          total={questions.length}
          onAnswered={handleAnswered}
          onNext={handleNext}
        />
      </div>
    </main>
  );
}
