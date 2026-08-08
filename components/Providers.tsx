"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import FirebaseAuthBridge from "@/components/FirebaseAuthBridge";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <FirebaseAuthBridge />
      {children}
    </SessionProvider>
  );
}
