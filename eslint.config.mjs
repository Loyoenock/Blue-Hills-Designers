import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const jsxA11yWarnRules = Object.keys(jsxA11yPlugin.rules || {}).reduce((acc, rule) => {
  acc[`jsx-a11y/${rule}`] = "warn";
  return acc;
}, {});

const eslintConfig = [
  ...compat.extends("next", "plugin:jsx-a11y/recommended"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      ...jsxA11yWarnRules,
    }
  }
];

export default eslintConfig;
