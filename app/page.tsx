import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Sparkles, Camera, Swords, Trophy, BookOpenCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import SignInCard from "@/components/SignInCard";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { icon: Camera, title: "Snap & Learn", desc: "Photograph textbook pages and let AI turn them into clean study notes." },
  { icon: Swords, title: "Fun Challenges", desc: "5-question quizzes tailored to your grade, with confetti for every win." },
  { icon: Trophy, title: "XP & Streaks", desc: "Earn XP and build a daily streak as you keep learning." },
  { icon: BookOpenCheck, title: "Exam Revision Hub", desc: "See your superpower topics and get quick flashcards on tricky ones." },
];

const STEPS = [
  { title: "Create a profile", desc: "Pick Grade 3 Explorer or Grade 6 Challenger." },
  { title: "Upload or challenge", desc: "Snap a textbook page or jump straight into a quiz." },
  { title: "Track progress", desc: "Review strong and weak topics before exams." },
];

export default async function Home({ searchParams }: { searchParams: { error?: string } }) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-brand-light/20 to-background dark:from-brand/10">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-16 text-center">
        <div className="flex w-full justify-end">
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 text-brand">
          <Sparkles size={40} />
          <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl">Fun Learning</h1>
        </div>
        <p className="mt-4 max-w-xl text-lg text-muted">
          A gamified learning app for school kids. Upload your notes, take fun
          quizzes, and level up your learning superpowers!
        </p>

        <div className="mt-8 flex justify-center">
          <SignInCard error={searchParams?.error} />
        </div>

        <div className="mt-16 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-3xl bg-surface p-5 text-left shadow-sm ring-1 ring-line">
              <Icon className="text-brand" size={26} />
              <h3 className="mt-3 font-heading text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 w-full rounded-3xl bg-surface p-8 text-left shadow-sm ring-1 ring-line">
          <h2 className="font-heading text-2xl font-bold text-foreground">How it works</h2>
          <ol className="mt-4 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ title, desc }, i) => (
              <li key={title}>
                <span className="font-heading text-xl font-bold text-brand">{i + 1}.</span>
                <p className="mt-1 font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Footer />
    </main>
  );
}
