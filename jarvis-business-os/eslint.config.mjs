import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "node_modules/**",
    "server.ts",
    "server/**",
    "src/components/**",
    "src/App.tsx",
    "src/index.css",
    "src/types.ts",
    "src/lib/geminiLive.ts",
  ]),
]);
