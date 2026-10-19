import { Card } from "@/components/ui/Card";

export function RouteShell({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-12">
      <Card className="w-full p-8 sm:p-12">
        <p className="mb-3 text-sm font-semibold tracking-wide text-evergreen-700">MannMitra</p>
        <h1 className="text-3xl font-bold tracking-tight text-evergreen-800">{title}</h1>
        <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground">{description}</p>
      </Card>
    </main>
  );
}
