import type { App } from "../types"

/** Always returns ok - it does not touch the database or anything else, so it cannot tell
 * you when either one is down. */
export function registerHealthRoutes(app: App): void {
  app.get("/health", () => ({ statusCode: 200, body: { status: "ok" } }))
}
