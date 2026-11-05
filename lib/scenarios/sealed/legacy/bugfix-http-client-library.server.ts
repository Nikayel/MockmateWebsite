import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined")
  throw new Error("Sealed scenario content must never load in the browser.")

const headers = `function mergeHeaders(defaults, overrides) {
  const normalized = {}
  for (const source of [defaults, overrides]) {
    for (const [name, value] of Object.entries(source)) normalized[name.toLowerCase()] = value
  }
  return normalized
}
module.exports = { mergeHeaders }
`

const response = `function decodeResponse(response) {
  if (response.status === 204) return null
  const header = Object.entries(response.headers).find(([name]) => name.toLowerCase() === "content-type")
  const mediaType = (header ? header[1] : "").split(";")[0].trim().toLowerCase()
  return mediaType === "application/json" ? JSON.parse(response.body) : response.body
}
module.exports = { decodeResponse }
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-http-client-library",
  bugDescription:
    "Header merging mutates shared defaults and response decoding assumes one header spelling and exact media type while missing no-content semantics.",
  rootCauseRubric: [
    "Separates request-state contamination from response interpretation.",
    "Normalizes both header sources before precedence is applied, without mutating either input.",
    "Recognizes media-type parameters and status 204 while preserving malformed-JSON errors.",
    "Verifies repeated/concurrent calls and failure propagation through the library's public client.",
  ],
  fixTradeoffs:
    "A local merge and decoder repair preserves the public transport boundary; replacing the client or adding network dependencies is unnecessary. Header work is linear in header count; JSON parsing is linear in body size.",
  referenceFiles: [
    { path: "src/headers.js", role: "editable", language: "javascript", content: headers },
    { path: "src/response.js", role: "editable", language: "javascript", content: response },
  ],
}
