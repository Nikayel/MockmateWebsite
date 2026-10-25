import { vi } from "vitest"

const fixture = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  authEmails: new Map<string, string>(),
  writes: [] as Array<{ path: string; fields: Record<string, unknown> }>,
}))
export { fixture }

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
function merge(
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): Record<string, unknown> {
  const result = structuredClone(previous)
  for (const [key, value] of Object.entries(next)) {
    const path = key.split(".")
    let target = result
    for (const part of path.slice(0, -1)) target = target[part] = object(target[part])
    const leaf = path.at(-1)!
    if (object(value).deleted === true) delete target[leaf]
    else
      target[leaf] =
        value && typeof value === "object" && !Array.isArray(value)
          ? merge(object(target[leaf]), object(value))
          : value
  }
  return result
}
vi.mock("firebase-admin/firestore", async (original) => ({
  ...(await original<typeof import("firebase-admin/firestore")>()),
  FieldValue: {
    delete: () => ({ deleted: true }),
    serverTimestamp: () => "server-now",
    increment: (n: number) => n,
  },
}))
vi.mock("@/lib/firebase-admin", () => {
  function ref(path: string) {
    return {
      path,
      id: path.split("/").at(-1),
      get: async () => {
        const value = structuredClone(fixture.rows.get(path))
        return {
          exists: value !== undefined,
          data: () => value,
          get: (key: string) => value?.[key],
        }
      },
      set: async (fields: Record<string, unknown>) => write({ path }, fields),
      update: async (fields: Record<string, unknown>) => write({ path }, fields),
      collection: (name: string) => collection(`${path}/${name}`),
    }
  }
  function write(reference: { path: string }, fields: Record<string, unknown>) {
    fixture.writes.push({ path: reference.path, fields })
    fixture.rows.set(reference.path, merge(fixture.rows.get(reference.path) ?? {}, fields))
  }
  function collection(path: string) {
    const filters: Array<[string, unknown]> = []
    const query = {
      doc: (id = "event") => ref(`${path}/${id}`),
      add: async (fields: Record<string, unknown>) => write({ path: `${path}/event` }, fields),
      where: (key: string, _operation: string, value: unknown) => {
        filters.push([key, value])
        return query
      },
      orderBy: () => query,
      limit: () => query,
      startAfter: () => query,
      get: async () => ({
        docs: [...fixture.rows]
          .filter(
            ([key, value]) =>
              key.startsWith(`${path}/`) &&
              !key.slice(path.length + 1).includes("/") &&
              filters.every(([field, expected]) => value[field] === expected)
          )
          .map(([key, value]) => ({
            id: key.split("/").at(-1),
            data: () => structuredClone(value),
          })),
      }),
    }
    return query
  }
  return {
    adminAuth: {
      verifyIdToken: async () => ({ uid: "learner" }),
      getUser: async (id: string) => ({
        email: fixture.authEmails.get(id) ?? "learner@example.test",
      }),
    },
    adminDb: {
      collection,
      runTransaction: async (run: (tx: unknown) => Promise<unknown>) =>
        run({
          get: (reference: ReturnType<typeof ref>) => reference.get(),
          set: write,
          update: write,
        }),
    },
  }
})

export function seedPreferences(overrides: Record<string, unknown> = {}) {
  fixture.rows.set("profiles/learner", {
    email: "learner@example.test",
    notification_preferences: {
      email_notifications_enabled: true,
      spaced_repetition_reminders: true,
      marketing_emails: false,
      ...overrides,
    },
  })
}
export function profile() {
  return fixture.rows.get("profiles/learner")!
}
