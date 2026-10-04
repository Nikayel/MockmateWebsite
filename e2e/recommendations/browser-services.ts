/** Test-only services; this fixture never authenticates against Firebase. */
const user = { uid: "fixture-owner" }
export function useAuth() {
  return { firebaseUser: user }
}

let attempt = 0
const get = async (url: string, init?: RequestInit) => {
  const state = new URLSearchParams(window.location.search).get("state") ?? "ready"
  const response = await fetch(
    `${url}&state=${encodeURIComponent(state)}&attempt=${++attempt}`,
    init
  )
  return {
    ok: response.ok,
    status: response.status,
    needsReauth: response.status === 401,
    data: response.ok ? await response.json() : undefined,
  }
}
export function useAuthedFetch() {
  return { get }
}

export function trackEvent(event: string, properties: Record<string, unknown>) {
  const events = JSON.parse(sessionStorage.getItem("recommendation-fixture-events") ?? "[]")
  events.push({ event, properties })
  sessionStorage.setItem("recommendation-fixture-events", JSON.stringify(events))
}
