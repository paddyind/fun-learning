"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { ProfileContext } from "@/lib/useActiveProfile";
import { listProfiles, getProfile, createProfile, seedDefaultSubjects, type Profile, type Grade } from "@/lib/db";
import ProfileSwitcherModal from "@/components/ProfileSwitcherModal";
import Card from "@/components/ui/Card";

const STORAGE_KEY = "activeProfileId";

function friendlyFirebaseError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/api-key|invalid-api-key|auth\/invalid/i.test(message)) {
    return "Firebase isn't configured yet — set real NEXT_PUBLIC_FIREBASE_* values in .env.local (see CLAUDE.md) to load profiles and data.";
  }
  if (/permission-denied/i.test(message)) {
    return "Firestore denied this request — make sure firestore.rules is deployed and the Firebase Admin credentials are set so the sign-in bridge can complete.";
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
