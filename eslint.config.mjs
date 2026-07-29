// eslint-config-next 16 ships native flat configs, so these are imported
// directly. Routing them through `FlatCompat` instead throws a circular
// -structure error inside the legacy eslintrc validator on ESLint 9.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react/no-unescaped-entities": "off",

      // Underscore-prefixed bindings and destructuring-omit siblings
      // (`const { pitch: _pitch, ...rest } = row`) are deliberate.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],

      // Advisory here rather than blocking. Client-side data loading in this
      // app is `useEffect` + `fetch` + `setState`, and the media-query and
      // workspace hooks sync browser/server state into React the same way.
      // Silencing it would hide real cascading-render bugs; making it an
      // error would demand a query library or `use()` + Suspense throughout.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
];

export default eslintConfig;
