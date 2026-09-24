import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { describe, expect, it } from "vitest"

import { config } from "./proxy"

const matchesProxy = (pathname: string) =>
  unstable_doesMiddlewareMatch({
    config,
    nextConfig: {},
    url: `https://codesparring.com${pathname}`,
  })

describe("proxy matcher", () => {
  it.each([
    "/admin",
    "/admin/users",
    "/learn/javascript/beginner/two-sum/workspace",
    "/learn/javascript/beginner/two-sum/workspace/hints",
    "/labs/palantir-911-dispatch",
    "/sprint-labs/meridian",
    "/sprint-labs/meridian/run/board",
  ])("runs for protected path %s", (pathname) => {
    expect(matchesProxy(pathname)).toBe(true)
  })

  it.each([
    "/",
    "/pricing",
    "/learn/javascript/beginner/two-sum",
    "/api/announcements",
    "/_next/static/chunks/app.js",
    "/magento_version",
  ])("bypasses public or infrastructure path %s", (pathname) => {
    expect(matchesProxy(pathname)).toBe(false)
  })
})
