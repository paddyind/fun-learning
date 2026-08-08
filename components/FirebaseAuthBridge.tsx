"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Bridges the Keycloak/NextAuth session into a Firebase Auth session so that
 * Firestore/Storage security rules (which only trust request.auth, populated
 * by Firebase Auth) can enforce per-family ownership. See CLAUDE.md for why
 * this indirection exists.
 */
export default function FirebaseAuthBridge() {
  const { data: session, status } = useSession();
  const bridgedForUid = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      if (status === "unauthenticated" && bridgedForUid.current) {
        bridgedForUid.current = null;
        firebaseSignOut(auth).catch(() => undefined);
      }
      return;
    }

    if (bridgedForUid.current === session.user.id) {
      return;
    }

    let cancelled = false;

    (async () => {
      const res = await fetch("/api/firebase-token");
      if (!res.ok) return;
      const { token } = await res.json();
      if (cancelled) return;
      await signInWithCustomToken(auth, token);
      bridgedForUid.current = session.user.id;
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, status]);

  return null;
}
