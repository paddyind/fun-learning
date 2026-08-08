"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Sparkles, LogOut, Users, HelpCircle } from "lucide-react";
import ProfileProvider from "@/components/ProfileProvider";
import XpBadge from "@/components/XpBadge";
import StreakFlame from "@/components/StreakFlame";
import ThemeToggle from "@/components/ThemeToggle";
import { useActiveProfile } from "@/lib/useActiveProfile";

function DashboardHeader() {
  const { activeProfile, clearActiveProfile } = useActiveProfile();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 bg-surface/90 px-4 py-3 shadow-sm ring-1 ring-line backdrop-blur sm:px-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-brand">
        <Sparkles size={26} />
        <span className="font-heading text-xl font-bold text-foreground">Fun Learning</span>
      </Link>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {activeProfile && (
          <>
            <div className="hidden text-right sm:block">
              <p className="font-heading text-sm font-bold text-foreground">{activeProfile.name}</p>
              <p className="text-xs text-muted">{activeProfile.grade}</p>
            </div>
            <XpBadge xp={activeProfile.xp_points} />
            <StreakFlame days={activeProfile.streak_days} />
            <button
              onClick={clearActiveProfile}
              title="Switch profile"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted ring-1 ring-line transition hover:bg-line active:scale-95"
            >
              <Users size={20} />
            </button>
          </>
        )}
        <Link
          href="/help"
          title="Help"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted ring-1 ring-line transition hover:bg-line active:scale-95"
        >
          <HelpCircle size={20} />
        </Link>
        <ThemeToggle />
        {/* Always visible, not just when a profile loaded — otherwise a
            broken Firebase bridge (see ProfileProvider's error card) leaves
            no way to sign out and start over. */}
        <button
          onClick={() => signOut()}
          title="Sign out"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted ring-1 ring-line transition hover:bg-line active:scale-95"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="px-4 py-6 sm:px-8">{children}</div>
      </div>
    </ProfileProvider>
  );
}
