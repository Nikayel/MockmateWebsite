import { describe, expect, it } from "vitest"
import { createApp } from "../../src/http/server"

describe("createApp", () => {
  it("responds to a registered GET route", async () => {
    const app = createApp()
    app.get("/ping", () => ({ statusCode: 200, body: { pong: true } }))

    const response = await app.inject({ method: "GET", url: "/ping" })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ pong: true })
  })

  it("responds to a registered POST route with a JSON body", async () => {
    const app = createApp()
    app.post("/echo", (req) => ({ statusCode: 200, body: { received: req.body } }))

    const response = await app.inject({
      method: "POST",
      url: "/echo",
      payload: { hello: "world" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ received: { hello: "world" } })
  })

  it("returns 404 for an unregistered route", async () => {
    const app = createApp()

    const response = await app.inject({ method: "GET", url: "/does-not-exist" })

    expect(response.statusCode).toBe(404)
  })
})
