import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/excalidraw-assets/**",
      "tests/e2e/**/*.spec.ts",
      "scripts/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Rule tuning — last in the array so this overrides preset severities.
    // Matches the philosophy of the prior .eslintrc.json: "warn, don't fail".
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler rules (eslint-plugin-react-hooks v7+ bundle).
      // Set to "warn" because the compiler-inspired hints are aspirational
      // (code is React-Compiler-optimizable) and not runtime correctness rules.
      // Each rule corresponds to a check the compiler performs at compile time
      // when React Compiler is enabled. Surface them as warnings so devs can
      // see and address them gradually without blocking commits.
      "react-hooks/capitalized-calls": "warn",
      "react-hooks/config": "warn",
      "react-hooks/component-hook-factories": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/exhaustive-effect-dependencies": "warn",
      "react-hooks/fbt": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/hooks": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/invariant": "warn",
      "react-hooks/memo-dependencies": "warn",
      "react-hooks/memoized-effect-dependencies": "warn",
      "react-hooks/no-deriving-state-in-effects": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/rule-suppression": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/syntax": "warn",
      "react-hooks/todo": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/void-use-memo": "warn",
      "@next/next/no-assign-module-variable": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "jsx-a11y/alt-text": "warn",
      "react/display-name": "warn",
      "prefer-const": "warn",
    },
  },
];
