import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <Card className="flex flex-col gap-5 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-evergreen-800">MannMitra</h1>
          <p className="text-sm text-muted-foreground">
            A gentle space to check in with yourself.
          </p>
        </div>
        <Input label="Email" placeholder="you@example.com" helper="We&apos;ll only use this to sign you in." />
        <Button size="lg" className="w-full">
          Continue
        </Button>
      </Card>
    </main>
  );
}
