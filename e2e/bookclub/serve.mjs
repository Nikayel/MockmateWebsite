// Isolated UI + real Python-worker verification. No auth or AI provider is contacted.
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
const require = createRequire(import.meta.url)
const viteRequire = createRequire(require.resolve("vitest/package.json"))
const { createServer } = viteRequire("vite")
const fixtureRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = resolve(fixtureRoot, "../..")
const server = await createServer({
  configFile: false,
  root: fixtureRoot,
  publicDir: resolve(repoRoot, "public"),
  define: { "process.env.PISTON_API_URL": JSON.stringify("") },
  esbuild: { jsx: "automatic" },
  css: { postcss: resolve(repoRoot, "postcss.config.mjs") },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "next/link", replacement: resolve(fixtureRoot, "router.tsx") },
      { find: "next/navigation", replacement: resolve(fixtureRoot, "router.tsx") },
      { find: "@", replacement: repoRoot },
    ],
  },
  server: { host: "127.0.0.1", port: 3102, strictPort: true, fs: { allow: [repoRoot] } },
  plugins: [
    {
      name: "bookclub-test-reference",
      configureServer(vite) {
        // Available only on this local test server; never a production app route.
        vite.middlewares.use("/__reference", async (_req, res) => {
          const { sealed } = await vite.ssrLoadModule(
            resolve(
              repoRoot,
              "lib/scenarios/sealed/legacy/bugfix-bookclub-reading-streak-workspace.server.ts"
            )
          )
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(sealed.referenceFiles))
        })
      },
    },
  ],
})
await server.listen()
