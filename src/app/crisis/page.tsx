import { ScreeningSupport } from "@/components/ScreeningSupport";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function CrisisPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
      <Card className="w-full p-7 sm:p-10">
        <p className="mb-6 text-sm font-semibold text-primary">MannMitra</p>
        <ScreeningSupport screened={false} />
        <Link
          href="/"
          className="mt-7 inline-block text-sm font-semibold text-primary underline underline-offset-4"
        >
          Back to MannMitra
        </Link>
      </Card>
    </main>
  );
}
