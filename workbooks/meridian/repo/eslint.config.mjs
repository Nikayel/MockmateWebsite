export default [
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    rules: {
      // Too noisy against the current HTTP boundary types to leave on - revisit once the
      // request/response shapes are tightened up.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]
