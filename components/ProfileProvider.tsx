"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { AlertTriangle, LogOut, RotateCw } from "lucide-react";
import { ProfileContext } from "@/lib/useActiveProfile";
import { listProfiles, getProfile, createProfile, seedDefaultSubjects, type Profile, type Grade } from "@/lib/db";
import ProfileSwitcherModal from "@/components/ProfileSwitcherModal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const STORAGE_KEY = "activeProfileId";

function friendlyFirebaseError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/api-key|invalid-api-key|auth\/invalid/i.test(message)) {
    return "Firebase isn't configured yet — set real NEXT_PUBLIC_FIREBASE_* values in .env.local (see CLAUDE.md) to load profiles and data.";
  }
  // Real Firestore reports this as "permission-denied"; the emulator's raw
  // rules-evaluation error looks like `false for 'list' @ L16` instead —
  // both mean the same thing: request.auth was never populated, almost
  // always because /api/firebase-token failed (e.g. placeholder
  // FIREBASE_ADMIN_* creds) so the custom-token sign-in never completed.
  if (/permission-denied|insufficient|false for '/i.test(message)) {
    return "Firestore denied this request — this usually means the Firebase sign-in bridge (/api/firebase-token) failed, most often because FIREBASE_ADMIN_* in .env.local is still a placeholder. Check the browser console/Network tab for the firebase-token request, and see docs/setup-guide.md §1d.";
  }
  return `Couldn't load your profiles: ${message}`;
}

export default function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parentUserId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!parentUserId) return;
    try {
      setError(null);
      const fetched = await listProfiles(parentUserId);
      setProfiles(fetched);

      const storedId = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const stored = storedId ? (fetched.find((p) => p.id === storedId) ?? null) : null;
      setActiveProfile(stored);
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }, [parentUserId]);

  useEffect(() => {
    if (status !== "authenticated" || !parentUserId) return;
    setLoading(true);
    refresh();
  }, [status, parentUserId, refresh]);

  const refreshActiveProfile = useCallback(async () => {
    if (!activeProfile) return;
    const fresh = await getProfile(activeProfile.id);
    if (fresh) setActiveProfile(fresh);
  }, [activeProfile]);

  const selectProfile = useCallback(
    (profileId: string) => {
      const p = profiles.find((pr) => pr.id === profileId);
      if (!p) return;
      setActiveProfile(p);
      window.localStorage.setItem(STORAGE_KEY, profileId);
    },
    [profiles]
  );

  const clearActiveProfile = useCallback(() => {
    setActiveProfile(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const createAndSelectProfile = useCallback(
    async (input: { name: string; grade: Grade }) => {
      if (!parentUserId) return;
      try {
        setError(null);
        const id = await createProfile({ ...input, parent_user_id: parentUserId });
        await seedDefaultSubjects(id);
        const created = await getProfile(id);
        if (created) {
          setProfiles((prev) => [...prev, created]);
          setActiveProfile(created);
          window.localStorage.setItem(STORAGE_KEY, id);
        }
      } catch (err) {
        setError(friendlyFirebaseError(err));
      }
    },
    [parentUserId]
  );

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        profiles,
        loading,
        error,
        selectProfile,
        createAndSelectProfile,
        clearActiveProfile,
        refreshActiveProfile,
      }}
    >
      {status === "authenticated" && !loading && error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
              <AlertTriangle size={22} />
              <h2 className="font-heading text-lg font-bold text-foreground">Something needs setting up</h2>
            </div>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex flex-1 items-center justify-center gap-2" onClick={refresh}>
                <RotateCw size={18} /> Try again
              </Button>
              <Button variant="ghost" className="flex items-center justify-center gap-2" onClick={() => signOut()}>
                <LogOut size={18} /> Sign out
              </Button>
            </div>
          </Card>
        </div>
      )}
      {status === "authenticated" && !loading && !error && !activeProfile && (
        <ProfileSwitcherModal profiles={profiles} onSelect={selectProfile} onCreate={createAndSelectProfile} />
      )}
      {children}
    </ProfileContext.Provider>
  );
}
