import type { DbClient } from "../../src/db/client"
import { createMeridianApp } from "../../src/app"
import type { MeridianApp } from "../../src/app"
import { createFakeHttpClient } from "./fake-http-client"
import type { FakeHttpClient } from "./fake-http-client"

export interface TestApp {
  meridian: MeridianApp
  httpClient: FakeHttpClient
}

export interface BuildTestAppOptions {
  /** Pass an existing db to share state across two `buildTestApp()` calls - most tests want
   * a fresh one, which is what omitting this gives you. */
  db?: DbClient
  /** A canned response the fake http client should return for every call. */
  webhookResponseStatus?: number
}

/** A fresh app, a fresh in-memory database (unless one is given), and a fresh fake http
 * client - nothing carries over between tests by default. */
export function buildTestApp(options: BuildTestAppOptions = {}): TestApp {
  const httpClient = createFakeHttpClient(
    options.webhookResponseStatus ? { status: options.webhookResponseStatus } : undefined
  )
  const meridian = createMeridianApp({ db: options.db, httpClient })
  return { meridian, httpClient }
}
