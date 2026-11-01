export const starter = `const { StoreUnavailableError } = require("./window-store")

function allowRequest(store, clientId, now, limit, windowMs) {
  const key = "rl:" + clientId
  try {
    store.removeBefore(key, now - windowMs)
    if (store.count(key) >= limit) return false
    store.add(key, now)
    return true
  } catch (error) {
    // Keep the gateway responsive when the store cannot answer.
    return true
  }
}

function simulateBurst(store, clientId, count, now, limit, windowMs) {
  let allowed = 0
  for (let i = 0; i < count; i++) {
    if (allowRequest(store, clientId, now, limit, windowMs)) allowed += 1
  }
  return allowed
}

module.exports = { allowRequest, simulateBurst }
`

export const windowStore = `class StoreUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = "StoreUnavailableError"
  }
}

class WindowStore {
  constructor() { this.records = new Map() }
  add(key, timestamp) {
    const existing = this.records.get(key) || []
    existing.push(timestamp)
    this.records.set(key, existing)
  }
  count(key) { return (this.records.get(key) || []).length }
  removeBefore(key, minTimestamp) {
    this.records.set(key, (this.records.get(key) || []).filter((time) => time >= minTimestamp))
  }
}

module.exports = { WindowStore, StoreUnavailableError }
`
