import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="font-pixel text-4xl font-bold text-[var(--accent)]">404 - Page Not Found</h1>
      <p className="mt-2 text-[var(--ink-muted)]">The requested pixel stage could not be located.</p>
      <Link href="/" className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white">
        Return Home
      </Link>
    </div>
  );
}
