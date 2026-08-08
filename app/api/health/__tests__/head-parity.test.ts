/**
 * HEAD and GET must agree about whether the system is up.
 *
 * HEAD used to return a bare 200 having run no checks at all, which made it a liveness probe for
 * the Next.js process and nothing more. HEAD is the default method for several uptime monitors, so
 * a monitor configured that way reported "up" for the full duration of a Firebase outage: the one
 * request whose job was to notice the incident was the one request that could not fail.
 *
 * The regression this pins is subtle in the worst way. Both methods return 200 in the healthy case,
 * so the divergence is invisible until there is an incident, which is exactly when nobody is
 * reading the code. So the assertions are all made with a dependency deliberately broken.
 *
 * `next/server` is stubbed globally in `vitest.setup.ts` with a `NextResponse` that only supports
 * `.json()`. This route also constructs bodiless responses with `new NextResponse(null, ...)`, so
 * the stub is replaced locally with one that supports both.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

class StubResponse {
  constructor(
    public body: unknown,
    public init?: { status?: number; headers?: Record<string, string> }
  ) {}

  get status(): number {
    return this.init?.status ?? 200
  }

  static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return new StubResponse(data, init)
  }
}

vi.mock("next/server", () => ({
  NextResponse: StubResponse,
  NextRequest: class {},
}))

const firebase = vi.hoisted(() => ({ shouldFail: false }))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => {
          if (firebase.shouldFail) throw new Error("Firestore unavailable")
          return { exists: true, data: () => ({}) }
        },
      }),
    }),
  },
}))

// The Stripe check is skipped (status "warn", never "fail") when the key is absent, which keeps the
// overall status out of "unhealthy" and lets Firebase be the single variable under test.
vi.stubEnv("STRIPE_SECRET_KEY", "")
vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_KEY", "{}")
vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project")

const { GET, HEAD } = await import("../route")

/** The route reads auth headers via `verifyCronRequest`; an anonymous monitor sends none. */
function anonymousRequest() {
  return { headers: { get: () => null }, url: "https://example.test/api/health" } as never
}

describe("GET /api/health and HEAD /api/health agree", () => {
  beforeEach(() => {
    firebase.shouldFail = false
  })

  it("HEAD reports 503 when a dependency is down", async () => {
    firebase.shouldFail = true
    const response = (await HEAD()) as unknown as StubResponse

    expect(response.status).toBe(503)
  })

  it("HEAD reports 200 when every dependency answers", async () => {
    const response = (await HEAD()) as unknown as StubResponse

    expect(response.status).toBe(200)
  })

  it("HEAD returns no body, as the method requires", async () => {
    const response = (await HEAD()) as unknown as StubResponse

    expect(response.body).toBeNull()
  })

  it("both methods return the same status for the same system state", async () => {
    for (const failing of [false, true]) {
      firebase.shouldFail = failing
      const getResponse = (await GET(anonymousRequest())) as unknown as StubResponse
      const headResponse = (await HEAD()) as unknown as StubResponse

      expect(headResponse.status, `firebase failing: ${failing}`).toBe(getResponse.status)
    }
  })

  it("never lets a health response be cached", async () => {
    const response = (await HEAD()) as unknown as StubResponse

    expect(response.init?.headers?.["Cache-Control"]).toContain("no-store")
  })
})
