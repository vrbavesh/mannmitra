"use client";

import Link from "next/link";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-12">
      <div className="w-full rounded-card border border-border bg-surface p-8 shadow-card sm:p-12">
        <h1 className="text-3xl font-bold text-evergreen-800">This page needs a moment</h1>
        <p className="mt-4 text-muted-foreground">Please try again. Your progress is still here.</p>
        <div className="mt-6 flex flex-wrap gap-5">
          <button className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2" onClick={() => retry()}>Try again</button>
          <Link className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2" href="/">Go to the start</Link>
        </div>
      </div>
    </main>
  );
}
