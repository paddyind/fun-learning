"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, XCircle } from "lucide-react";
import type { QuizQuestion } from "@/lib/gemini";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true,
  });
}

function isCorrect(question: QuizQuestion, answer: string): boolean {
  if (question.type === "mcq") {
    return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === question.correctAnswer.trim().toLowerCase()) return true;
  return question.acceptableKeywords.some((kw) => normalized.includes(kw.trim().toLowerCase()));
}

export default function QuizQuestionCard({
  question,
  index,
  total,
  onAnswered,
  onNext,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const result = isCorrect(question, answer);
    setCorrect(result);
    setRevealed(true);
    onAnswered(result);
    if (result) fireConfetti();
  };

  return (
    <Card>
      <p className="text-sm font-semibold text-brand">
        Question {index + 1} of {total} · {question.topic}
      </p>
      <h2 className="mt-2 font-heading text-xl font-bold text-foreground">{question.question}</h2>

      {question.type === "mcq" ? (
        <div className="mt-4 grid gap-3">
          {question.options.map((option) => {
            const isSelected = answer === option;
            const isRightOption = revealed && option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            const isWrongSelected = revealed && isSelected && !correct;
            return (
              <button
                key={option}
                disabled={revealed}
                onClick={() => setAnswer(option)}
                className={`flex min-h-[56px] items-center justify-between rounded-2xl border-2 px-5 py-3 text-left text-lg font-medium text-foreground transition active:scale-[0.98] disabled:active:scale-100 ${
                  isRightOption
                    ? "border-xp bg-xp/10"
                    : isWrongSelected
                      ? "border-red-400 bg-red-50 dark:bg-red-950/40"
                      : isSelected
                        ? "border-brand bg-brand-light/10"
                        : "border-line-strong hover:border-brand/50"
                }`}
              >
                {option}
                {isRightOption && <CheckCircle2 className="text-xp" size={22} />}
                {isWrongSelected && <XCircle className="text-red-400" size={22} />}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          disabled={revealed}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer"
          className="mt-4 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-background px-4 text-lg text-foreground placeholder:text-muted focus:border-brand focus:outline-none disabled:bg-surface-muted"
        />
      )}

      {revealed && (
        <div
          className={`mt-4 rounded-2xl p-4 text-foreground ${correct ? "bg-xp/10" : "bg-encourage/10"}`}
        >
          <p className="font-heading font-bold">
            {correct ? "Great job! 🎉" : "Almost! Here's the trick:"}
          </p>
          {!correct && <p className="mt-1 text-sm text-muted">Correct answer: {question.correctAnswer}</p>}
          <p className="mt-1 text-sm text-muted">{question.explanation}</p>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        {!revealed ? (
          <Button disabled={!answer.trim()} onClick={handleSubmit}>
            Submit answer
          </Button>
        ) : (
          <Button onClick={onNext}>{index + 1 === total ? "See my results" : "Next question"}</Button>
        )}
      </div>
    </Card>
  );
}
