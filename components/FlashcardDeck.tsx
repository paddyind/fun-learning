"use client";

import { useEffect, useState } from "react";
import { RotateCw, Timer } from "lucide-react";
import type { Flashcard } from "@/lib/gemini";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FlashcardDeck({ cards, onExit }: { cards: Flashcard[]; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const card = cards[index];

  return (
    <Card className="text-center">
      <div className="flex items-center justify-between text-sm font-semibold text-muted">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span className="flex items-center gap-1">
          <Timer size={16} /> {formatTime(secondsLeft)}
        </span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-4 flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-3xl bg-brand-light/10 p-6 text-foreground transition active:scale-[0.98]"
      >
        <p className="font-heading text-lg font-bold">{flipped ? card.back : card.front}</p>
        <span className="flex items-center gap-1 text-xs font-semibold text-brand">
          <RotateCw size={14} /> Tap to {flipped ? "see question" : "reveal answer"}
        </span>
      </button>

      <div className="mt-5 flex justify-center gap-3">
        {index + 1 < cards.length ? (
          <Button
            onClick={() => {
              setIndex((i) => i + 1);
              setFlipped(false);
            }}
          >
            Next card
          </Button>
        ) : (
          <Button onClick={onExit}>Finish revision</Button>
        )}
        <Button variant="ghost" onClick={onExit}>
          Exit
        </Button>
      </div>
    </Card>
  );
}
