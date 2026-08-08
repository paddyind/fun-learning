"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { KeyRound, Loader2, User } from "lucide-react";
import { DEMO_LOGIN } from "@/lib/demoLogin";
import Button from "@/components/ui/Button";

// NextAuth passes back a coarse error code via ?error=, not a message.
// OAuthSignin/OAuthCallback/Callback mean Keycloak itself is unreachable or
// misconfigured (e.g. KEYCLOAK_ISSUER is still the .env.local placeholder)
// — that's expected until real Keycloak is set up, and the demo account is
// the deliberate fallback, so say that instead of a generic "check your
// details" (which reads like a password typo, not a missing server).
function describeAuthError(error: string): { message: string; isKeycloak: boolean } {
  if (["OAuthSignin", "OAuthCallback", "Callback", "OAuthCreateAccount"].includes(error)) {
    return {
      message:
        "Keycloak isn't reachable yet — that's expected until it's configured (see docs/setup-guide.md). Use the demo account below instead.",
      isKeycloak: true,
    };
  }
  if (error === "CredentialsSignin") {
    return { message: "That demo email/password combo wasn't recognized — check /help for the exact values.", isKeycloak: false };
  }
  return { message: "That didn't work — check your details and try again.", isKeycloak: false };
}

export default function SignInCard({ error }: { error?: string }) {
  const authError = error ? describeAuthError(error) : null;
  const [showDemo, setShowDemo] = useState(authError?.isKeycloak ?? false);
  const [email, setEmail] = useState(DEMO_LOGIN.email);
  const [password, setPassword] = useState(DEMO_LOGIN.password);
  const [loading, setLoading] = useState<"keycloak" | "demo" | null>(null);

  const handleKeycloak = () => {
    setLoading("keycloak");
    signIn("keycloak", { callbackUrl: "/dashboard" });
  };

  const handleDemo = async (e: FormEvent) => {
    e.preventDefault();
    setLoading("demo");
    await signIn("demo", { email, password, callbackUrl: "/dashboard" });
    setLoading(null);
  };

  return (
    <div className="w-full max-w-sm rounded-3xl bg-surface p-6 text-left shadow-xl ring-1 ring-line">
      <Button
        className="flex w-full items-center justify-center gap-2"
        onClick={handleKeycloak}
        disabled={loading !== null}
      >
        {loading === "keycloak" ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
        Sign in with Keycloak
      </Button>

      {authError && (
        <p className="mt-3 text-center text-sm font-semibold text-red-500 dark:text-red-400">{authError.message}</p>
      )}

      {!showDemo ? (
        <button
          onClick={() => setShowDemo(true)}
          className="mt-4 w-full text-center text-sm font-semibold text-muted hover:text-brand hover:underline"
        >
          Don&apos;t have Keycloak credentials? Use the demo account
        </button>
      ) : (
        <form onSubmit={handleDemo} className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <User size={14} /> Demo account (local testing only)
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border-2 border-line-strong bg-background px-3 text-sm text-foreground focus:border-brand focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border-2 border-line-strong bg-background px-3 text-sm text-foreground focus:border-brand focus:outline-none"
          />
          <Button
            variant="secondary"
            type="submit"
            className="flex w-full items-center justify-center gap-2"
            disabled={loading !== null}
          >
            {loading === "demo" ? <Loader2 className="animate-spin" size={20} /> : "Sign in with demo account"}
          </Button>
        </form>
      )}
    </div>
  );
}
