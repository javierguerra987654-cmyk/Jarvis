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
    "src/lib/clapDetector.ts",
    "src/lib/dataProvider.ts",
    "src/lib/firebase.ts",
    "src/lib/geminiLiveClient.ts",
    "src/lib/speechManager.ts",
    "src/lib/auth.ts",
    "src/contexts/AuthContext.tsx",
  ]),
]);
