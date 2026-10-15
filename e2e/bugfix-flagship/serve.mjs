// QA-only composition of shipped UI, authored content and the real Pyodide worker.
// No account, database, LLM, checkout, or production API is used.
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const require = createRequire(import.meta.url)
const { createServer } = createRequire(require.resolve("vitest/package.json"))("vite")
const fixtureRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = resolve(fixtureRoot, "../..")
const server = await createServer({
  configFile: false,
  root: fixtureRoot,
  publicDir: resolve(repoRoot, "public"),
  esbuild: { jsx: "automatic" },
  // Next normally replaces these reads; this isolated Vite page has no Next runtime.
  define: { "process.env": "{}" },
  css: { postcss: resolve(repoRoot, "postcss.config.mjs") },
  resolve: { dedupe: ["react", "react-dom"], alias: { "@": repoRoot } },
  server: { host: "127.0.0.1", port: 3102, strictPort: true, fs: { allow: [repoRoot] } },
})
await server.listen()
server.printUrls()
