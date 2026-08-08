"use client";

import { useEffect, useState } from "react";
import { useActiveProfile } from "@/lib/useActiveProfile";
import { listSubjects, listQuizResults, type Subject, type QuizResult } from "@/lib/db";
import SubjectCard from "@/components/SubjectCard";

function computeProgress(results: QuizResult[], subjectId: string): number {
  const subjectResults = results.filter((r) => r.subject_id === subjectId).slice(0, 5);
  if (subjectResults.length === 0) return 0;
  const total = subjectResults.reduce((sum, r) => sum + r.score / r.total_questions, 0);
  return Math.round((total / subjectResults.length) * 100);
}

export default function DashboardPage() {
  const { activeProfile, loading } = useActiveProfile();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;
    setFetching(true);
    setError(null);
    Promise.all([listSubjects(activeProfile.id), listQuizResults(activeProfile.id)])
      .then(([subjectList, resultList]) => {
        setSubjects(subjectList);
        setResults(resultList);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your subjects."))
      .finally(() => setFetching(false));
  }, [activeProfile]);

  if (loading || !activeProfile) {
    return null;
  }

  return (
    <main>
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Hey {activeProfile.name}! Ready to learn? 🚀
      </h1>
      <p className="mt-1 text-muted">Pick a subject to get started.</p>

      {error ? (
        <p className="mt-8 text-sm font-semibold text-red-500 dark:text-red-400">{error}</p>
      ) : fetching ? (
        <p className="mt-8 text-muted">Loading your subjects...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} progress={computeProgress(results, subject.id)} />
          ))}
        </div>
      )}
    </main>
  );
}
