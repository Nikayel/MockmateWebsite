#!/usr/bin/env node
/**
 * Live AI vendor drill.
 *
 * Proves, with the real keys from the environment / .env.local, that every rung
 * of the production chain answers: OpenAI -> DeepSeek -> Gemini, matching
 * FALLBACK_ORDER in lib/ai-providers.ts.
 *
 * For OpenAI it probes each REASONING EFFORT the routing table actually uses,
 * because effort is this system's quality dial and its cost is paid in latency.
 * A model that passes at `none` can still be unusable at `xhigh`, and the
 * capability that decides the product's feel (`dialogue`, at `low`) is not the
 * capability that decides its scores (`critique`, at `xhigh`).
 *
 * Latency is REPORTED, never asserted. A previous migration passed a drill and
 * was still rejected on 0.9s-30s+ variance across repeated probes, so read the
 * numbers rather than trusting the exit code, and use --repeat to see spread.
 *
 *   node scripts/ai-fallback-drill.mjs
 *   node scripts/ai-fallback-drill.mjs --repeat 5
 *   node scripts/ai-fallback-drill.mjs --candidate gemini-3.5-flash
 *
 * Exits non-zero if any configured vendor fails. Costs a few tokens per probe;
 * the xhigh probe costs the most because reasoning tokens bill as output.
 * Model pins mirror lib/ai/model-ids.ts (this file cannot import TS).
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
    }
  }
}

loadEnvLocal()

const OPENAI_KEY = process.env.OPENAI_API_KEY || ""
const GEMINI_KEY = process.env.GEMINI_API_KEY || ""
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ""

const PINNED_LUNA = process.env.OPENAI_MODEL_LUNA || "gpt-5.6-luna"
const PINNED_FLASH = process.env.GEMINI_MODEL_FLASH || "gemini-3.6-flash"
const PINNED_DS_FLASH = process.env.DEEPSEEK_MODEL_FLASH || "deepseek-v4-flash"
const PINNED_DS_PRO = process.env.DEEPSEEK_MODEL_PRO || "deepseek-v4-pro"

/**
 * Liveness probe: cheap, and every vendor answers it the same way.
 */
const PROMPT = 'Reply with ONLY this exact JSON: {"ok": true}'

/**
 * Effort probe. Deliberately NOT the trivial prompt above.
 *
 * The model spends reasoning tokens in proportion to how hard the task is, so
 * asking it for a fixed string produces 0 reasoning tokens at EVERY effort
 * level. The first version of this drill did exactly that and reported
 * "0 reasoning tokens" across the board, which is indistinguishable from
 * `reasoning_effort` being ignored entirely. A drill that cannot tell those
 * apart cannot validate the one dial this system's quality depends on.
 *
 * Still ends in a JSON contract so the pass/fail check stays mechanical.
 */
const REASONING_PROMPT =
  "A merge sort allocates a new array per recursive call. Determine whether O(1) " +
  "auxiliary space is achievable for a STABLE merge, and state the real lower " +
  'bound. Then reply with ONLY this JSON: {"ok": true, "achievable": <true|false>}'

const TIMEOUT_MS = 60000

const arg = (flag) => {
  const i = process.argv.indexOf(flag)
  return i > -1 ? process.argv[i + 1] : null
}
const candidateModel = arg("--candidate")
const repeat = Math.max(1, Number(arg("--repeat") ?? 1) || 1)

/** The efforts the routing table actually uses, cheapest first. */
const PROBED_EFFORTS = [
  ["none", "simple: hints, diagnosis"],
  ["low", "dialogue: the live interviewer"],
  ["high", "complex: feedback generation"],
  ["xhigh", "critique: the scoring path"],
]

async function checkOpenAI(model, effort) {
  const started = Date.now()
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: REASONING_PROMPT }],
      // Generous budget on purpose: reasoning tokens are spent before any
      // visible text, so a tight cap makes a high-effort call return empty and
      // look like a vendor failure.
      max_completion_tokens: 8192,
      reasoning_effort: effort,
      stream: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} ${await response.text()}`.slice(0, 160))
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ""
  if (!text.includes('"ok"')) {
    throw new Error(
      `unexpected reply (finish_reason=${data.choices?.[0]?.finish_reason ?? "?"}): ${text.slice(0, 120)}`
    )
  }
  return {
    ms: Date.now() - started,
    // The number that actually explains the cost and the latency at this effort.
    reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
  }
}

async function checkDeepSeek(model) {
  const started = Date.now()
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: PROMPT }],
      max_tokens: 64,
      temperature: 0,
      stream: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ""
  if (!text.includes('"ok"')) throw new Error(`unexpected reply: ${text.slice(0, 120)}`)
  return { ms: Date.now() - started }
}

async function checkGemini(model) {
  const started = Date.now()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }] }],
        // Generous budget: thinking-enabled models spend tokens on thoughts
        // before any visible text; a tight cap yields an empty reply.
        generationConfig: { maxOutputTokens: 2048, temperature: 0 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  )
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  const candidate = data.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
  if (!text.includes('"ok"')) {
    throw new Error(
      `unexpected reply (finishReason=${candidate?.finishReason ?? "?"}): ${text.slice(0, 120)}`
    )
  }
  return { ms: Date.now() - started }
}

/** Build the check list in the same order production degrades through it. */
const checks = []

for (const [effort, note] of PROBED_EFFORTS) {
  checks.push({
    label: `openai/${effort}`,
    model: PINNED_LUNA,
    note,
    configured: !!OPENAI_KEY,
    missing: "OPENAI_API_KEY unset",
    run: () => checkOpenAI(PINNED_LUNA, effort),
  })
}
checks.push({
  label: "deepseek/flash",
  model: PINNED_DS_FLASH,
  note: "fallback for the volume paths",
  configured: !!DEEPSEEK_KEY,
  missing: "DEEPSEEK_API_KEY unset",
  run: () => checkDeepSeek(PINNED_DS_FLASH),
})
checks.push({
  label: "deepseek/pro",
  model: PINNED_DS_PRO,
  note: "fallback for the score-producing paths",
  configured: !!DEEPSEEK_KEY,
  missing: "DEEPSEEK_API_KEY unset",
  run: () => checkDeepSeek(PINNED_DS_PRO),
})
checks.push({
  label: "gemini",
  model: PINNED_FLASH,
  note: "last rung",
  configured: !!GEMINI_KEY,
  missing: "GEMINI_API_KEY unset",
  run: () => checkGemini(PINNED_FLASH),
})
if (candidateModel) {
  checks.push({
    label: "candidate",
    model: candidateModel,
    note: "migration candidate",
    configured: !!GEMINI_KEY,
    missing: "GEMINI_API_KEY unset",
    run: () => checkGemini(candidateModel),
  })
}

let failed = 0
for (const check of checks) {
  if (!check.configured) {
    failed++
    console.log(`FAIL ${check.label} (${check.model}) — ${check.missing}`)
    continue
  }

  const timings = []
  let error = null
  let reasoning
  for (let i = 0; i < repeat; i++) {
    try {
      const result = await check.run()
      timings.push(result.ms)
      if (result.reasoningTokens !== undefined) reasoning = result.reasoningTokens
    } catch (e) {
      error = e
      break
    }
  }

  if (error) {
    failed++
    console.log(`FAIL ${check.label} (${check.model}) — ${error.message}`)
    continue
  }

  // Spread matters more than the mean: the rejected migration averaged fine.
  const min = Math.min(...timings)
  const max = Math.max(...timings)
  const span = repeat > 1 ? `${min}-${max}ms over ${repeat}` : `${min}ms`
  const thoughts = reasoning !== undefined ? `, ${reasoning} reasoning tokens` : ""
  console.log(`PASS ${check.label} (${check.model}) ${span}${thoughts} — ${check.note}`)

  // 0 reasoning tokens at a non-zero effort means the dial is inert: either the
  // parameter was rejected, or the vendor stopped honouring it. Both are silent
  // failures that leave the routing table describing behaviour it no longer has.
  if (check.label.startsWith("openai/") && !check.label.endsWith("/none") && reasoning === 0) {
    failed++
    console.log(
      `  ^ FAIL: effort "${check.label.split("/")[1]}" spent 0 reasoning tokens. ` +
        `reasoning_effort is not taking effect.`
    )
  }
}

if (failed > 0) {
  console.log(`\n${failed} check(s) failed.`)
} else {
  console.log(`\nAll ${checks.length} checks passed. Read the latencies, do not just trust this line.`)
}

process.exit(failed > 0 ? 1 : 0)
