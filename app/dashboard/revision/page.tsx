"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trophy, TrendingDown, Sparkles, Loader2 } from "lucide-react";
import { useActiveProfile } from "@/lib/useActiveProfile";
import { listQuizResults, listSubjects, type QuizResult, type Subject } from "@/lib/db";
import type { Flashcard } from "@/lib/gemini";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlashcardDeck from "@/components/FlashcardDeck";

const STRONG_THRESHOLD = 0.75;
const WEAK_THRESHOLD = 0.6;

interface TopicStat {
  topic: string;
  attempts: number;
  accuracy: number;
}

export default function RevisionPage() {
  return (
    <Suspense fallback={null}>
      <RevisionPageInner />
    </Suspense>
  );
}

function RevisionPageInner() {
  const { activeProfile } = useActiveProfile();
  const searchParams = useSearchParams();
  const subjectFilter = searchParams.get("subject") ?? undefined;

  const [results, setResults] = useState<QuizResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([listQuizResults(activeProfile.id, subjectFilter), listSubjects(activeProfile.id)])
      .then(([resultList, subjectList]) => {
        setResults(resultList);
        setSubjects(subjectList);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load your revision history."))
      .finally(() => setLoading(false));
  }, [activeProfile, subjectFilter]);

  const { topicStats, weakConcepts, byMonth } = useMemo(() => {
    const statsByTopic = new Map<string, { correct: number; total: number }>();
    const weakConceptCounts = new Map<string, number>();
    const grouped = new Map<string, QuizResult[]>();

    for (const r of results) {
      const existing = statsByTopic.get(r.topic) ?? { correct: 0, total: 0 };
      existing.correct += r.score;
      existing.total += r.total_questions;
      statsByTopic.set(r.topic, existing);

      for (const concept of r.weak_concepts) {
        weakConceptCounts.set(concept, (weakConceptCounts.get(concept) ?? 0) + 1);
      }

      const monthKey = r.created_at?.toDate
        ? r.created_at.toDate().toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : "Recent";
      grouped.set(monthKey, [...(grouped.get(monthKey) ?? []), r]);
    }

    const stats: TopicStat[] = Array.from(statsByTopic.entries()).map(([topic, { correct, total }]) => ({
      topic,
      attempts: total,
      accuracy: total > 0 ? correct / total : 0,
    }));

    const weak = Array.from(weakConceptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([concept]) => concept);

    return { topicStats: stats, weakConcepts: weak, byMonth: grouped };
  }, [results]);

  const superpowerTopics = topicStats.filter((t) => t.accuracy >= STRONG_THRESHOLD).sort((a, b) => b.accuracy - a.accuracy);
  const needPracticeTopics = topicStats.filter((t) => t.accuracy < WEAK_THRESHOLD).sort((a, b) => a.accuracy - b.accuracy);

  const handleGenerateFlashcards = async () => {
    if (!activeProfile) return;
    const concepts = (weakConcepts.length > 0 ? weakConcepts : needPracticeTopics.map((t) => t.topic)).slice(0, 6);
    if (concepts.length === 0) return;

    setGenerating(true);
    setGenerateError(null);
    try {
      const subjectName = subjects.find((s) => s.id === subjectFilter)?.name ?? needPracticeTopics[0]?.topic ?? "General";
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: activeProfile.id, subject_name: subjectName, concepts }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Couldn't create flashcards right now.");
      const data = await res.json();
      setFlashcards(data.flashcards);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Couldn't create flashcards right now.");
    } finally {
      setGenerating(false);
    }
  };

  if (!activeProfile) return null;

  if (flashcards) {
    return (
      <main className="mx-auto max-w-xl">
        <h1 className="font-heading text-2xl font-bold text-foreground">Quick Flash Card Revision</h1>
        <div className="mt-5">
          <FlashcardDeck cards={flashcards} onExit={() => setFlashcards(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">Exam Revision Hub</h1>
      <p className="mt-1 text-muted">See how you&apos;re doing and get a quick revision boost.</p>

      {loadError ? (
        <p className="mt-8 text-sm font-semibold text-red-500 dark:text-red-400">{loadError}</p>
      ) : loading ? (
        <p className="mt-8 text-muted">Loading your history...</p>
      ) : results.length === 0 ? (
        <Card className="mt-6">
          <p className="text-muted">No quizzes yet — take a challenge to start building your revision history!</p>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2 text-xp">
                <Trophy size={22} />
                <h2 className="font-heading text-lg font-bold text-foreground">Superpower Topics</h2>
              </div>
              {superpowerTopics.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Keep going — your superpowers are still charging up!</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {superpowerTopics.map((t) => (
                    <li key={t.topic} className="flex justify-between rounded-xl bg-xp/10 px-3 py-2 text-sm font-semibold text-foreground dark:bg-xp/20">
                      <span>{t.topic}</span>
                      <span>{Math.round(t.accuracy * 100)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-encourage">
                <TrendingDown size={22} />
                <h2 className="font-heading text-lg font-bold text-foreground">Need Extra Practice</h2>
              </div>
              {needPracticeTopics.length === 0 && weakConcepts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nothing here — great work!</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {needPracticeTopics.map((t) => (
                    <li key={t.topic} className="flex justify-between rounded-xl bg-encourage/10 px-3 py-2 text-sm font-semibold text-foreground dark:bg-encourage/20">
                      <span>{t.topic}</span>
                      <span>{Math.round(t.accuracy * 100)}%</span>
                    </li>
                  ))}
                  {weakConcepts.slice(0, 5).map((c) => (
                    <li key={c} className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium text-muted ring-1 ring-line">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-brand">
                <Sparkles size={22} />
                <h2 className="font-heading text-lg font-bold text-foreground">Quick Flash Card Revision</h2>
              </div>
              <Button
                className="flex items-center gap-2"
                disabled={generating || (weakConcepts.length === 0 && needPracticeTopics.length === 0)}
                onClick={handleGenerateFlashcards}
              >
                {generating ? <Loader2 className="animate-spin" size={20} /> : "Start 5-min revision"}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted">
              A quick set of flashcards built from the topics you&apos;ve found tricky.
            </p>
            {generateError && (
              <p className="mt-2 text-sm font-semibold text-red-500 dark:text-red-400">{generateError}</p>
            )}
          </Card>

          <div className="mt-8">
            <h2 className="font-heading text-lg font-bold text-foreground">History</h2>
            <div className="mt-3 space-y-4">
              {Array.from(byMonth.entries()).map(([month, monthResults]) => (
                <div key={month}>
                  <p className="text-sm font-semibold text-muted">{month}</p>
                  <div className="mt-2 space-y-2">
                    {monthResults.map((r) => (
                      <Card key={r.id} className="flex items-center justify-between py-3">
                        <span className="font-medium text-foreground">{r.topic}</span>
                        <span className="text-sm font-semibold text-muted">
                          {r.score}/{r.total_questions}
                        </span>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
