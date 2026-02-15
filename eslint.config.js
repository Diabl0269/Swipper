const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const parser = require("@typescript-eslint/parser");

module.exports = [
  {
    ignores: [
      "browser-profile/**",
      "coverage/**",
      "dist/**",
      "docs/**",
      "**/*.d.ts", // Ignore all generated declaration files
      "*.config.js", // Exclude eslint.config.js
      "jest.config.js" // Explicitly exclude jest.config.js
    ],
  },
  {
    files: ["src/**/*.ts"], // Lint only source TypeScript files
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, String: true }, // Add Node.js globals for 'process' and String global
      parser: parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Add custom rules specific to src files if needed
    },
  },
  {
    files: ["tests/**/*.ts"], // Lint only test TypeScript files
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.jest, String: true }, // Add Node.js and Jest globals, and String global
      parser: parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off", // Disable for test files
      // Add custom rules specific to test files if needed
    },
  },
];
