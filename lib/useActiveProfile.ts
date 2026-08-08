"use client";

import { createContext, useContext } from "react";
import type { Profile, Grade } from "@/lib/db";

export interface ProfileContextValue {
  activeProfile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  selectProfile: (profileId: string) => void;
  createAndSelectProfile: (input: { name: string; grade: Grade }) => Promise<void>;
  clearActiveProfile: () => void;
  refreshActiveProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useActiveProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useActiveProfile must be used within a ProfileProvider");
  }
  return ctx;
}
