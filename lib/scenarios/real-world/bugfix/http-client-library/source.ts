export const headers = `function mergeHeaders(defaults, overrides) {
  const merged = Object.assign(defaults, overrides)
  const normalized = {}
  for (const [name, value] of Object.entries(merged)) normalized[name.toLowerCase()] = value
  return normalized
}
module.exports = { mergeHeaders }
`

export const response = `function decodeResponse(response) {
  const contentType = response.headers["Content-Type"] || ""
  if (contentType === "application/json") return JSON.parse(response.body)
  return response.body
}
module.exports = { decodeResponse }
`

export const client = `const { mergeHeaders } = require("./headers")
const { decodeResponse } = require("./response")

function createClient(transport, defaults = {}) {
  return {
    async get(path, headers = {}) {
      const response = await transport.send({ method: "GET", path, headers: mergeHeaders(defaults, headers) })
      if (response.status >= 400) throw new Error("HTTP " + response.status)
      return decodeResponse(response)
    }
  }
}
module.exports = { createClient }
`

export const readme = `# Parcel HTTP client

Parcel is a small original HTTP client library used by several service teams.
This exercise uses a local injected transport. It makes no real network calls.

createClient(transport, defaults).get(path, headers) sends one request and returns
the decoded body. The transport returns { status, headers, body }, with body a string.

mergeHeaders(defaults, overrides) returns a NEW object with lowercase header names.
Headers are case-insensitive: each override wins over any casing of the default.
Neither input may be mutated, and a previous request must not affect a later one.
Each input object has at most one spelling per header name; values are strings.

decodeResponse(response) reads Content-Type case-insensitively. For media type
application/json (case-insensitive, optional parameters and surrounding spaces),
parse the body as JSON. Return null for status 204 regardless of content type.
Otherwise return the body string unchanged, including empty text/plain bodies.
Malformed non-204 JSON must still throw. Do not mutate the response.

The client propagates transport failures and HTTP errors. Keep these behaviors
and the exported signatures. Diagnose each failing regression through the client
before patching its implementation. Explain how you prevented request state leaks.
`
