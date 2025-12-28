/**
 * Vitest global setup
 * Mocks external dependencies for unit tests
 */

import { vi } from 'vitest'

// Mock Next.js server components
vi.mock('next/server', () => ({
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

// Mock Firebase (client-side)
vi.mock('./lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  auth: {
    currentUser: null,
  },
}))

// Mock Firebase Admin (server-side)
vi.mock('./lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: false, data: () => null })),
        set: vi.fn(() => Promise.resolve()),
      })),
      add: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
    })),
    runTransaction: vi.fn((fn: (t: unknown) => Promise<unknown>) => fn({
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    })),
  },
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}))

// Mock environment variables
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
