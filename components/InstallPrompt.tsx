"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "installPromptDismissed";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      if (window.localStorage.getItem(DISMISSED_KEY)) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    window.localStorage.setItem(DISMISSED_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-3 rounded-2xl bg-slate-800 px-4 py-3 text-white shadow-xl sm:inset-x-auto sm:right-6 sm:max-w-sm">
      <div className="flex items-center gap-3">
        <Download size={22} />
        <p className="text-sm font-medium">Install Fun Learning for quick access, even offline-ready soon!</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={install}
          className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold transition hover:bg-brand-dark active:scale-95"
        >
          Install
        </button>
        <button onClick={dismiss} className="rounded-full p-1.5 text-slate-300 hover:bg-slate-700" aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
