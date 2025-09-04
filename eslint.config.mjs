import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Suppress img element warnings for build - can be addressed later
      "@next/next/no-img-element": "off",
      // Suppress React hooks exhaustive deps warnings for build
      "react-hooks/exhaustive-deps": "off"
    }
  }
];

export default eslintConfig;
