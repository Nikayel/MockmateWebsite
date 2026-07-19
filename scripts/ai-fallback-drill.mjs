#!/usr/bin/env node
/**
 * Live AI vendor drill.
 *
 * Proves, with the real keys from the environment / .env.local, that:
 *   1. the pinned Gemini model answers (primary path),
 *   2. DeepSeek answers (the fallback both lib/ai-providers.ts and
 *      lib/ai-providers-edge.ts degrade to),
 *   3. optionally, a migration-candidate Gemini model answers with JSON intact.
 *
 * Run it before launches, live demos, and model migrations:
 *   node scripts/ai-fallback-drill.mjs
 *   node scripts/ai-fallback-drill.mjs --candidate gemini-3.5-flash
 *
 * Exits non-zero if any checked vendor fails. Costs a few tokens per run.
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

const GEMINI_KEY = process.env.GEMINI_API_KEY || ""
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ""
const PINNED_FLASH = process.env.GEMINI_MODEL_FLASH || "gemini-2.5-flash"
const PROMPT = 'Reply with ONLY this exact JSON: {"ok": true}'
const TIMEOUT_MS = 30000

const candidateFlagIndex = process.argv.indexOf("--candidate")
const candidateModel = candidateFlagIndex > -1 ? process.argv[candidateFlagIndex + 1] : null

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
  return Date.now() - started
}

async function checkDeepSeek() {
  const started = Date.now()
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
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
  return Date.now() - started
}

const checks = []
if (GEMINI_KEY) checks.push(["gemini", PINNED_FLASH, () => checkGemini(PINNED_FLASH)])
else checks.push(["gemini", PINNED_FLASH, () => Promise.reject(new Error("GEMINI_API_KEY unset"))])
if (DEEPSEEK_KEY) checks.push(["deepseek", "deepseek-chat", () => checkDeepSeek()])
else
  checks.push([
    "deepseek",
    "deepseek-chat",
    () => Promise.reject(new Error("DEEPSEEK_API_KEY unset")),
  ])
if (candidateModel) checks.push(["candidate", candidateModel, () => checkGemini(candidateModel)])

let failed = 0
for (const [label, model, run] of checks) {
  try {
    const ms = await run()
    console.log(`PASS ${label} (${model}) ${ms}ms`)
  } catch (error) {
    failed++
    console.log(`FAIL ${label} (${model}) — ${error.message}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
