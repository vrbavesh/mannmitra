import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-12">
      <Card className="w-full p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-evergreen-800">We couldn&apos;t find that page</h1>
        <p className="mt-4 text-muted-foreground">The link may have changed. You can return to the start and continue from there.</p>
        <Link className="mt-6 inline-block font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2" href="/">Go to the start</Link>
      </Card>
    </main>
  );
}
