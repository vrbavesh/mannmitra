import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Vitest does not load .env.local the way Next.js does. Minimal loader,
 * only for the RLS suite (test-side); the app itself reads env via Next.
 */
export function loadEnvLocal(): void {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) {
    throw new Error(".env.local not found — RLS tests need Supabase keys (blueprint §6.1)");
  }
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} in .env.local`);
  return v;
}
