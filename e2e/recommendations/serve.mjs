// Isolated browser verification of the real card, hook and catalog selector.
// No production app route, auth override, or external database/AI request.
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const require = createRequire(import.meta.url)
const viteRequire = createRequire(require.resolve("vitest/package.json"))
const { createServer } = viteRequire("vite")
const fixtureRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = resolve(fixtureRoot, "../..")
const browserServices = resolve(fixtureRoot, "browser-services.ts")
const plans = new Map()
async function recommendationFor(vite) {
  const { scenarios } = await vite.ssrLoadModule(resolve(repoRoot, "lib/scenarios.ts"))
  const { selectNextPractice } = await vite.ssrLoadModule(
    resolve(repoRoot, "lib/agents/recommendations/next-practice.ts")
  )
  const source = scenarios.find((scenario) => scenario.id === "dsa-two-sum")
  return selectNextPractice(
    {
      id: "source",
      user_id: "fixture-owner",
      started_at: "today",
      completed_at: "today",
      feedback: "Saved report",
      type: source.type,
      scenario_id: source.id,
      topic: source.title,
      difficulty: source.difficulty,
      language: "python",
      score_breakdown: { communicationScore: 40 },
      structured_feedback: {
        fixNext: ["Explain what each map entry represents before implementing the lookup."],
      },
    },
    scenarios
  )
}
const server = await createServer({
  configFile: false,
  root: fixtureRoot,
  esbuild: { jsx: "automatic" },
  define: { "process.env.PISTON_API_URL": JSON.stringify("") },
  css: { postcss: resolve(repoRoot, "postcss.config.mjs") },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@/lib/auth-context", replacement: browserServices },
      { find: "@/lib/analytics", replacement: browserServices },
      { find: "./useAuthedFetch", replacement: browserServices },
      { find: "@", replacement: repoRoot },
    ],
  },
  server: { host: "127.0.0.1", port: 3101, strictPort: true, fs: { allow: [repoRoot] } },
  plugins: [
    {
      name: "recommendation-fixture-api",
      configureServer(vite) {
        vite.middlewares.use("/api/practice-plan", async (req, res) => {
          res.setHeader("Content-Type", "application/json")
          res.setHeader("Cache-Control", "private, no-store")
          const state = new URL(req.url, "http://localhost").searchParams.get("state")
          const owner = req.headers["x-fixture-owner"]
          if (
            (state === "save_failure" && req.method === "POST") ||
            (state === "remove_failure" && req.method === "DELETE")
          ) {
            res.statusCode = 503
            return res.end(
              JSON.stringify({ error: "We couldn't confirm that change. Please try again." })
            )
          }
          if (req.method === "POST") {
            let body = ""
            for await (const chunk of req) body += chunk
            const request = JSON.parse(body)
            plans.set(owner, {
              userId: "fixture-owner",
              sourceSessionId: request.sourceSessionId,
              recommendation: await recommendationFor(vite),
              revision: crypto.randomUUID(),
              savedAt: new Date().toISOString(),
              reminderAt: request.reminderAt,
              timezone: request.timezone,
              reminderStatus: request.reminderAt ? "pending" : "none",
              nextAttemptAt: request.reminderAt,
              attempts: 0,
            })
          }
          if (req.method === "DELETE") plans.delete(owner)
          const plan = plans.get(owner)
          res.end(
            JSON.stringify(
              plan
                ? state === "complete"
                  ? {
                      status: "complete",
                      plan,
                      completedSessionId: "completed",
                      observations: ["Communication: 40 → 65. These were different exercises."],
                    }
                  : { status: "ready", plan }
                : { status: "empty" }
            )
          )
        })
        vite.middlewares.use("/api/recommendations/next-practice", async (req, res) => {
          const params = new URL(req.url, "http://localhost").searchParams
          const state = params.get("state")
          res.setHeader("Content-Type", "application/json")
          res.setHeader("Cache-Control", "private, no-store")
          if (state === "saving" && Number(params.get("attempt")) <= 2)
            return res.end(JSON.stringify({ status: "not_ready" }))
          if (state === "no_match") return res.end(JSON.stringify({ status: "no_match" }))
          if (state === "error") {
            res.statusCode = 503
            return res.end("{}")
          }
          if (state === "reauth") {
            res.statusCode = 401
            return res.end("{}")
          }
          try {
            const recommendation = await recommendationFor(vite)
            if (recommendation && state === "long") {
              recommendation.title += ` — ${"a longer task title ".repeat(12)}`
              recommendation.feedbackNote =
                "A long feedback note with concrete details about the attempted approach. "
                  .repeat(7)
                  .slice(0, 500)
            }
            res.end(
              JSON.stringify(
                recommendation ? { status: "ready", recommendation } : { status: "no_match" }
              )
            )
          } catch (error) {
            console.error(error)
            res.statusCode = 500
            res.end(JSON.stringify({ status: "unavailable" }))
          }
        })
      },
    },
  ],
})
await server.listen()
server.printUrls()
