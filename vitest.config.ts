import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // e2e/ is Playwright's territory — keep it out of the Vitest unit run.
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", ".next/**", "drizzle/**", "src/__tests__/**"],
    },
  },
});
