export const visibleTests = `const assert = require("node:assert/strict")
const { WindowStore, StoreUnavailableError } = require("../src/window-store")
const { allowRequest, simulateBurst } = require("../src/rate-limiter")

async function runTests(record) {
  await record("healthy single requests and bursts respect the plan", () => {
    const store = new WindowStore()
    assert.equal(allowRequest(store, "client", 1000, 3, 60000), true)
    assert.equal(simulateBurst(store, "client", 5, 1000, 3, 60000), 2)
    assert.equal(store.count("rl:client"), 3)
  })

  await record("a storage outage does not admit an unverified request", () => {
    const store = new WindowStore()
    store.count = () => { throw new StoreUnavailableError("read timed out") }
    assert.equal(allowRequest(store, "client", 1000, 3, 60000), false)
    assert.deepEqual(store.records.get("rl:client") || [], [])
  })

  await record("an unexpected error remains visible to the caller", () => {
    const store = new WindowStore()
    const failure = new TypeError("invalid store response")
    store.count = () => { throw failure }
    assert.throws(() => allowRequest(store, "client", 1000, 3, 60000), (error) => error === failure)
  })
}

module.exports = { runTests }
`

export const hiddenTests = `const assert = require("node:assert/strict")
const { WindowStore, StoreUnavailableError } = require("../src/window-store")
const { allowRequest, simulateBurst } = require("../src/rate-limiter")

async function runTests(record) {
  await record("cleanup failure ends the decision before later store calls", () => {
    const store = new WindowStore()
    let laterCalls = 0
    store.removeBefore = () => { throw new StoreUnavailableError("cleanup timed out") }
    store.count = store.add = () => { laterCalls += 1; return 0 }
    assert.equal(allowRequest(store, "client", 1000, 3, 60000), false)
    assert.equal(laterCalls, 0)
  })

  await record("a failed reservation is denied without a retry", () => {
    const store = new WindowStore()
    let attempts = 0
    store.add = () => { attempts += 1; throw new StoreUnavailableError("write timed out") }
    assert.equal(allowRequest(store, "client", 1000, 3, 60000), false)
    assert.equal(attempts, 1)
    assert.equal(store.count("rl:client"), 0)
  })

  await record("a lost write acknowledgment neither retries nor rolls back usage", () => {
    const store = new WindowStore()
    const add = store.add.bind(store)
    let attempts = 0
    store.add = (key, timestamp) => {
      attempts += 1
      add(key, timestamp)
      throw new StoreUnavailableError("acknowledgment lost")
    }
    assert.equal(allowRequest(store, "client", 1000, 3, 60000), false)
    assert.equal(attempts, 1)
    assert.equal(store.count("rl:client"), 1)
    store.add = add
    assert.equal(simulateBurst(store, "client", 5, 1001, 3, 60000), 2)
  })

  await record("the next request can succeed after storage recovers", () => {
    const store = new WindowStore()
    const count = store.count.bind(store)
    store.count = () => { throw new StoreUnavailableError("temporarily unavailable") }
    assert.equal(allowRequest(store, "client", 1000, 1, 60000), false)
    store.count = count
    assert.equal(allowRequest(store, "client", 1001, 1, 60000), true)
    assert.equal(allowRequest(store, "client", 1002, 1, 60000), false)
  })

  await record("unexpected failures propagate unchanged from every store operation", () => {
    for (const operation of ["removeBefore", "count", "add"]) {
      const store = new WindowStore()
      const failure = new Error("unexpected " + operation + " failure")
      store[operation] = () => { throw failure }
      assert.throws(() => allowRequest(store, "client", 1000, 3, 60000), (error) => error === failure)
    }
  })

  await record("an error name or message alone does not identify a storage outage", () => {
    for (const failure of [new Error("read timed out"), new Error("StoreUnavailableError")]) {
      const store = new WindowStore()
      failure.name = "StoreUnavailableError"
      store.count = () => { throw failure }
      assert.throws(() => allowRequest(store, "client", 1000, 3, 60000), (error) => error === failure)
    }
  })

  await record("non-Error thrown values also propagate unchanged", () => {
    for (const failure of [null, undefined, false, "offline", { code: "UNKNOWN" }]) {
      const store = new WindowStore()
      store.count = () => { throw failure }
      assert.throws(() => allowRequest(store, "client", 1000, 3, 60000), (error) => error === failure)
    }
  })

  await record("a burst excludes unavailable decisions and preserves unexpected failures", () => {
    const store = new WindowStore()
    store.count = () => { throw new StoreUnavailableError("read timed out") }
    assert.equal(simulateBurst(store, "client", 4, 1000, 3, 60000), 0)
    const failure = new RangeError("invalid timestamp")
    store.count = () => { throw failure }
    assert.throws(() => simulateBurst(store, "client", 4, 1000, 3, 60000), (error) => error === failure)
  })

  await record("expiry, inclusive boundaries, identical timestamps and client isolation still work", () => {
    const store = new WindowStore()
    store.add("rl:client", 39999)
    store.add("rl:client", 40000)
    assert.equal(simulateBurst(store, "client", 5, 100000, 3, 60000), 2)
    assert.equal(allowRequest(store, "client", 100000, 3, 60000), false)
    assert.equal(allowRequest(store, "other", 100000, 1, 60000), true)
    assert.equal(store.count("rl:client"), 3)
  })
}

module.exports = { runTests }
`
