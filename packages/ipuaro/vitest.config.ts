import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
                "src/**/*.d.ts",
                "src/**/index.ts",
                "src/**/*.test.ts",
                "src/tui/**/*.ts",
                "src/tui/**/*.tsx",
                "src/cli/**/*.ts",
            ],
            thresholds: {
                lines: 95,
                functions: 95,
                branches: 91.9,
                statements: 95,
            },
        },
    },
})
