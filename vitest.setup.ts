/**
 * Vitest global setup
 * Mocks external dependencies for unit tests
 */

import { vi } from "vitest"

// Mock Next.js server components
vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    headers: Map<string, string>
    url: string

    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this.url = url
      this.headers = new Map(Object.entries(init?.headers || {}))
    }

    json() {
      return Promise.resolve({})
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
    }),
  },
}))

// `server-only`'s own runtime check looks for a Next.js build-time marker that only exists inside
// an actual `next build`/`next dev` bundling pass; under plain Vitest (no Next.js bundler involved
// at all) it throws unconditionally on import, real server-side test code and all. Stubbed to a
// no-op here -- exactly like `next/server` above -- so a module that legitimately does
// `import "server-only"` (e.g. lib/sprint-labs/provisioning/materialize-initial-tree.ts) stays
// testable under Vitest while still getting the real package's build-time guard in the actual app.
vi.mock("server-only", () => ({}))

// Mock Firebase (client-side)
vi.mock("./lib/firebase", () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  auth: {
    currentUser: null,
  },
}))

// Mock Firebase Admin (server-side)
vi.mock("./lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: false, data: () => null })),
        set: vi.fn(() => Promise.resolve()),
      })),
      add: vi.fn(() => Promise.resolve({ id: "mock-id" })),
    })),
    runTransaction: vi.fn((fn: (t: unknown) => Promise<unknown>) =>
      fn({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
      })
    ),
  },
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}))

// Mock environment variables
// NODE_ENV is set by vitest automatically, no need to modify
process.env.STRIPE_SECRET_KEY = "sk_test_mock"
