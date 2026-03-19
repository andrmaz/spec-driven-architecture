import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["database/**/*.test.ts", "server/**/*.test.ts", "app/lib/**/*.test.ts"],
    server: {
      deps: {
        inline: ["drizzle-zod"],
      },
    },
  },
});
