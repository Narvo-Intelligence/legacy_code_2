import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Preload before FlatCompat loads eslint-config-next (Rush patch needs this file in the module chain on ESLint 9.39+).
const require = createRequire(import.meta.url);
require("@rushstack/eslint-patch/modern-module-resolution");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ["build/**", ".next/**", "node_modules/**"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Add any custom rules here
    },
  },
];

export default eslintConfig;
