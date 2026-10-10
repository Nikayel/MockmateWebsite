/** Test-only services; this fixture never authenticates against Firebase. */
const user = { uid: "fixture-owner" }
export function useAuth() {
  return { firebaseUser: user }
}
let attempt = 0
function owner() {
  let id = localStorage.getItem("practice-fixture-owner")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("practice-fixture-owner", id)
  }
  return id
}
async function request(url: string, init?: RequestInit) {
  const target = new URL(url, window.location.origin)
  target.searchParams.set(
    "state",
    new URLSearchParams(window.location.search).get("state") ?? "ready"
  )
  target.searchParams.set("attempt", String(++attempt))
  const response = await fetch(target, {
    ...init,
    headers: { ...init?.headers, "X-Fixture-Owner": owner() },
  })
  return {
    ok: response.ok,
    status: response.status,
    needsReauth: response.status === 401,
    data: await response.json(),
  }
}
const get = (url: string, init?: RequestInit) => request(url, init)
const send = (url: string, method: string, body: unknown, init?: RequestInit) =>
  request(url, {
    ...init,
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
export function useAuthedFetch() {
  return { get, send }
}
export function trackEvent(event: string, properties: Record<string, unknown>) {
  const events = JSON.parse(sessionStorage.getItem("recommendation-fixture-events") ?? "[]")
  events.push({ event, properties })
  sessionStorage.setItem("recommendation-fixture-events", JSON.stringify(events))
}
