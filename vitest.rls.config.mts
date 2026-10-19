import { defineConfig } from "vitest/config";

/**
 * RLS suite: hits the REAL Supabase project (two users, cross-user matrix).
 * Kept out of `npm test` (which is offline-only) and run via `npm run verify:rls`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Network + one shared project: run files sequentially to avoid user-id collisions.
    fileParallelism: false,
  },
});
