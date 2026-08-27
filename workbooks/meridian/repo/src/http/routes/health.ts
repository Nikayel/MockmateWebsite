import type { App } from "../types"

/** Always returns ok. Does not touch the database or anything else. */
export function registerHealthRoutes(app: App): void {
  app.get("/health", () => ({ statusCode: 200, body: { status: "ok" } }))
}
