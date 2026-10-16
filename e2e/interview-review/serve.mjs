import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const require = createRequire(import.meta.url)
const { createServer } = createRequire(require.resolve("vitest/package.json"))("vite")
const root = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = resolve(root, "../..")
const browserServices = resolve(repoRoot, "e2e/recommendations/browser-services.ts")
const server = await createServer({
  configFile: false,
  root,
  esbuild: { jsx: "automatic" },
  css: { postcss: resolve(repoRoot, "postcss.config.mjs") },
  define: { "process.env.PISTON_API_URL": JSON.stringify("") },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@/lib/auth-context", replacement: browserServices },
      { find: "@/lib/analytics", replacement: browserServices },
      { find: "./useAuthedFetch", replacement: browserServices },
      { find: "@", replacement: repoRoot },
    ],
  },
  server: { host: "127.0.0.1", port: 3103, strictPort: true, fs: { allow: [repoRoot] } },
})
await server.listen()
server.printUrls()
