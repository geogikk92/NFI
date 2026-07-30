import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Без това нито един server-only модул не може да се тества:
      // пакетът хвърля при внасяне. Виж test-stubs/server-only.ts.
      "server-only": fileURLToPath(
        new URL("./test-stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "app/generated/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/db.ts", "**/*.test.ts"],
    },
  },
});
