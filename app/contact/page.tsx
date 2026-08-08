import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-brand">
          <ArrowLeft size={16} /> Back home
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-6 font-heading text-3xl font-bold text-foreground">Contact Us</h1>
      <p className="mt-2 text-muted">
        Fun Learning is currently a work-in-progress project. Reach out with questions, feedback, or issues:
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:support@funlearning.app"
          className="flex items-center gap-3 rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line transition hover:ring-brand"
        >
          <Mail className="text-brand" size={24} />
          <div>
            <p className="font-heading font-bold text-foreground">Email</p>
            <p className="text-sm text-muted">support@funlearning.app</p>
          </div>
        </a>
        <Link
          href="/help"
          className="flex items-center gap-3 rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line transition hover:ring-brand"
        >
          <MessageCircle className="text-brand" size={24} />
          <div>
            <p className="font-heading font-bold text-foreground">Help Center</p>
            <p className="text-sm text-muted">Common questions & demo login</p>
          </div>
        </Link>
      </div>

      <div className="mt-auto pt-10">
        <Footer />
      </div>
    </main>
  );
}
