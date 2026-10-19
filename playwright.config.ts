import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
