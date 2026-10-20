import Link from "next/link";

const linkClasses =
  "inline-flex h-9 items-center rounded-control px-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3";

/** Shared app header: brand, program links, profile and the always-visible support action. */
export function AppHeader({ displayName }: { displayName?: string }) {
  return (
    <header className="border-b border-border/70 bg-surface/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <Link
          href="/home"
          className="text-sm font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          MannMitra
        </Link>
        <nav aria-label="App navigation" className="flex items-center gap-1 sm:gap-2">
          <Link href="/program" className={linkClasses}>
            30 days
          </Link>
          <Link href="/progress" className={`${linkClasses} hidden sm:inline-flex`}>
            Progress
          </Link>
          <Link href="/settings" className={linkClasses} aria-label="Profile and settings">
            <span className="max-w-24 truncate">{displayName?.trim() || "Profile"}</span>
          </Link>
          <Link
            href="/crisis"
            className="inline-flex h-9 items-center rounded-control bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-evergreen-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Support
          </Link>
        </nav>
      </div>
    </header>
  );
}
