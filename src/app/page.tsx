import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <Card className="flex flex-col gap-5 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-evergreen-800">MannMitra</h1>
          <p className="text-sm text-muted-foreground">A gentle space to check in with yourself.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-control bg-primary px-7 text-base font-semibold text-primary-foreground transition-[transform,background-color] duration-[120ms] ease-out hover:bg-evergreen-700 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Create an account
          </Link>
          <Link
            href="/signin"
            className="inline-flex h-12 items-center justify-center rounded-control border border-border bg-surface px-7 text-base font-semibold text-foreground transition-[transform,background-color] duration-[120ms] ease-out hover:bg-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Sign in
          </Link>
        </div>
      </Card>
    </main>
  );
}
