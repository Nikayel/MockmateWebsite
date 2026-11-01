import { createHash, randomUUID } from "node:crypto"
import { createRequire } from "node:module"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

// Explicit, paid authoring check. Normal tests and CI never run this command.
config({ path: ".env.local", quiet: true })
const require = createRequire(import.meta.url)
const scenarioId = process.argv[2]
const outputPath = process.argv[3]
const selectedRole = process.argv[4]
if (!scenarioId || !outputPath) {
  throw new Error(
    "Usage: pnpm validate:debugging:ai <scenario-id> <output.json> [interviewer|partner]"
  )
}
if (selectedRole && !["interviewer", "partner"].includes(selectedRole))
  throw new Error("Unknown AI role")
const { getScenarioById } = require("../lib/scenarios.ts")
const scenario = getScenarioById(scenarioId)
if (!scenario?.workspace || !["bugfix", "add-functionality"].includes(scenario.type)) {
  throw new Error("Choose a published debugging workspace scenario")
}
const { buildSessionContext } = require("../lib/interview/session-context/snapshot.ts")
const { buildChatRequestContext } = require("../lib/interview/chat/request-context.ts")
const { resolveChatInterviewState } = require("../lib/interview/chat/interview-state.ts")
const { buildChatModelInput } = require("../lib/interview/chat/model-input.ts")
const { generateValidatedChatResponse } = require("../lib/interview/chat/generate-response.ts")

const sessionContext = buildSessionContext({
  task: {
    id: scenario.id,
    title: scenario.title,
    type: scenario.type,
    description: scenario.description,
  },
  workspace: scenario.workspace.files.map((file) => ({ ...file, originalContent: file.content })),
  code: "",
  interviewerMessages: [],
  partnerMessages: [],
})
const probes = [
  {
    role: "interviewer",
    message:
      "I understand the incident. I am reading the source and will run the baseline tests before editing.",
  },
  {
    role: "partner",
    message:
      "Explain the public contract and which failure cases I should verify. Do not give me an implementation or a patch.",
  },
]
const report = {
  scenarioId,
  checkedAt: new Date().toISOString(),
  scope:
    "Live production prompt and response pipeline; no HTTP authentication or session persistence",
  turns: [],
}
try {
  for (const probe of probes.filter((probe) => !selectedRole || probe.role === selectedRole)) {
    const request = buildChatRequestContext({
      ...probe,
      scenarioId,
      scenarioTitle: scenario.title,
      scenarioType: scenario.type,
      sessionContext,
    })
    request.generationId = randomUUID()
    const state = resolveChatInterviewState(request)
    const input = await buildChatModelInput(request, state, {}, undefined)
    if (input.promptFlow.earlyResponse) throw new Error("Probe skipped before model generation")
    const response = await generateValidatedChatResponse({
      request,
      systemPrompt: input.systemPrompt,
      history: input.history,
      fullUserMessage: input.promptFlow.fullUserMessage,
      currentPhase: state.currentPhase,
      userId: undefined,
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.text.trim()) throw new Error("Empty live response")
    report.turns.push({
      ...probe,
      provider: response.provider,
      latencyMs: response.latencyMs,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      promptHash: createHash("sha256")
        .update(input.systemPrompt + input.promptFlow.fullUserMessage)
        .digest("hex"),
      reply: response.text,
    })
    writeFileSync(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Received live ${probe.role} reply via ${response.provider}`)
  }
} catch (error) {
  writeFileSync(resolve(outputPath), `${JSON.stringify({ ...report, failed: true }, null, 2)}\n`)
  throw error
}
console.log(
  `Review the replies in ${resolve(outputPath)}; successful requests alone do not establish response quality.`
)
