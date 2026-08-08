import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line py-8 text-center text-sm text-muted">
      <div className="flex justify-center gap-6">
        <Link href="/help" className="hover:text-brand">
          Help
        </Link>
        <Link href="/contact" className="hover:text-brand">
          Contact Us
        </Link>
      </div>
      <p className="mt-3">© {new Date().getFullYear()} Fun Learning</p>
    </footer>
  );
}
