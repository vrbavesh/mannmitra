import Link from "next/link";
import { Card } from "@/components/ui/Card";

/**
 * Rendered by `forbidden()` when a server guard rejects a page. The proxy also
 * returns a 403 for future program days before rendering, so this is the calm
 * backup UI for races and direct server calls.
 */
export default function Forbidden() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
      <Card className="w-full space-y-4 p-7 sm:p-10">
        <p className="text-sm font-semibold text-primary">MannMitra</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          This page is not open just yet.
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          Some parts of your program open at their own local midnight. Nothing is lost, and your 30
          day map shows what is available.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/home"
            className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform duration-[120ms] hover:bg-evergreen-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100"
          >
            Back to home
          </Link>
          <Link
            href="/program"
            className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-transform duration-[120ms] hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100"
          >
            See your 30 days
          </Link>
        </div>
      </Card>
    </main>
  );
}
