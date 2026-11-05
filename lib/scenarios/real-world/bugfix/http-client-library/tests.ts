export const visibleTests = `const assert = require("node:assert/strict")
const { createClient } = require("../src/client")

async function runTests(record) {
  await record("a JSON response with lowercase headers is decoded", async () => {
    const client = createClient({ send: async () => ({ status: 200, headers: { "content-type": "application/json; charset=utf-8" }, body: '{"ok":true}' }) })
    assert.deepEqual(await client.get("/health"), { ok: true })
  })
  await record("request overrides do not change later requests", async () => {
    const requests = []
    const defaults = { Accept: "application/json" }
    const client = createClient({ send: async request => {
      requests.push(request)
      return { status: 200, headers: {}, body: "ok" }
    } }, defaults)
    await client.get("/export", { accept: "text/plain" })
    await client.get("/health")
    assert.deepEqual(requests.map(r => r.headers.accept), ["text/plain", "application/json"])
    assert.deepEqual(defaults, { Accept: "application/json" })
  })
  await record("a no-content response has a null result", async () => {
    const client = createClient({ send: async () => ({ status: 204, headers: { "Content-Type": "application/json" }, body: "" }) })
    assert.equal(await client.get("/empty"), null)
  })
}
module.exports = { runTests }
`

export const hiddenTests = `const assert = require("node:assert/strict")
const { mergeHeaders } = require("../src/headers")
const { decodeResponse } = require("../src/response")
const { createClient } = require("../src/client")

async function runTests(record) {
  await record("header override precedence does not depend on spelling", () => {
    const defaults = { accept: "application/json", "X-Client": "parcel" }
    const overrides = { ACCEPT: "text/csv" }
    assert.deepEqual(mergeHeaders(defaults, overrides), { accept: "text/csv", "x-client": "parcel" })
    assert.deepEqual(defaults, { accept: "application/json", "X-Client": "parcel" })
    assert.deepEqual(overrides, { ACCEPT: "text/csv" })
  })
  await record("returned headers belong only to that request", () => {
    const defaults = { Accept: "application/json" }
    const first = mergeHeaders(defaults, {})
    first.accept = "changed"
    assert.equal(mergeHeaders(defaults, {}).accept, "application/json")
  })
  await record("media type casing and parameters do not change decoding", () => {
    const response = { status: 200, headers: { "CoNtEnT-TyPe": " Application/JSON ; charset=UTF-8 " }, body: "[0,false,null]" }
    const before = JSON.stringify(response)
    assert.deepEqual(decodeResponse(response), [0, false, null])
    assert.equal(JSON.stringify(response), before)
  })
  await record("ordinary text and empty text remain strings", () => {
    assert.equal(decodeResponse({ status: 200, headers: { "content-type": "text/plain" }, body: "" }), "")
    assert.equal(decodeResponse({ status: 200, headers: {}, body: "hello" }), "hello")
    assert.equal(decodeResponse({ status: 200, headers: { "Content-Type": "application/jsonp" }, body: "callback()" }), "callback()")
  })
  await record("malformed JSON still fails instead of becoming empty data", () => {
    assert.throws(() => decodeResponse({ status: 200, headers: { "content-type": "application/json" }, body: "{" }))
  })
  await record("no-content remains distinct from an empty JSON document", () => {
    assert.equal(decodeResponse({ status: 204, headers: {}, body: "" }), null)
    assert.throws(() => decodeResponse({ status: 200, headers: { "Content-Type": "application/json" }, body: "" }))
  })
  await record("concurrent requests have isolated header sets", async () => {
    const requests = []
    const client = createClient({ send: async req => {
      requests.push(req)
      return { status: 200, headers: {}, body: "ok" }
    } })
    await Promise.all([client.get("/one", { "X-Trace": "one" }), client.get("/two", { "X-Trace": "two" })])
    assert.deepEqual(requests.map(r => r.headers["x-trace"]), ["one", "two"])
  })
  await record("transport and HTTP failures still propagate", async () => {
    const error = new Error("offline")
    const client = createClient({ send: async () => { throw error } })
    try { await client.get("/health"); assert.fail("expected a transport rejection") }
    catch (thrown) { assert.equal(thrown, error) }
    const rejected = createClient({ send: async () => ({ status: 503, headers: {}, body: "offline" }) })
    await assert.rejects(() => rejected.get("/health"), /HTTP 503/)
  })
}
module.exports = { runTests }
`
