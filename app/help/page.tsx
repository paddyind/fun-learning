import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { DEMO_LOGIN } from "@/lib/demoLogin";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

const FAQS = [
  {
    q: "How do I sign in?",
    a: "Fun Learning uses Keycloak for parent sign-in. If your school or family hasn't set up Keycloak yet, use the demo account below to try out the app locally.",
  },
  {
    q: "What's a 'profile'?",
    a: "Each parent account can have multiple kid profiles — one per child. Pick Grade 3 Explorer or Grade 6 Challenger when you create one, and switch between profiles anytime from the dashboard header.",
  },
  {
    q: "How does the photo upload work?",
    a: "Take a photo of a textbook or workbook page, tell us the subject and chapter, and our AI turns it into clean study notes you can revise from or build a quiz around.",
  },
  {
    q: "How does the quiz work?",
    a: "Pick a subject, answer 5 questions tailored to your grade, and get instant feedback with a friendly explanation for every answer.",
  },
  {
    q: "Is my child's data safe?",
    a: "Each family's profiles, notes, and quiz results are isolated from every other family's — nobody else can read or write your data.",
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-brand">
          <ArrowLeft size={16} /> Back home
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-6 font-heading text-3xl font-bold text-foreground">Help</h1>

      <div className="mt-6 rounded-3xl border-2 border-dashed border-brand/40 bg-brand-light/10 p-5">
        <div className="flex items-center gap-2 text-brand">
          <KeyRound size={20} />
          <h2 className="font-heading text-lg font-bold text-foreground">Don&apos;t have Keycloak credentials yet?</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Use this demo account from the sign-in page to explore Fun Learning locally — no Keycloak setup needed:
        </p>
        <dl className="mt-3 space-y-1 rounded-2xl bg-surface p-4 font-mono text-sm ring-1 ring-line">
          <div className="flex justify-between">
            <dt className="text-muted">Email</dt>
            <dd className="font-semibold text-foreground">{DEMO_LOGIN.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Password</dt>
            <dd className="font-semibold text-foreground">{DEMO_LOGIN.password}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          For local testing only — this demo login will be switched off once your Keycloak server is configured.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {FAQS.map(({ q, a }) => (
          <div key={q}>
            <h3 className="font-heading font-bold text-foreground">{q}</h3>
            <p className="mt-1 text-sm text-muted">{a}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Still stuck?{" "}
        <Link href="/contact" className="font-semibold text-brand hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  );
}
