import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerReloadCheckpoint, reloadAfterCheckpoint } from "./reload-checkpoint"

let unregister: (() => void) | undefined
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  unregister?.()
  vi.useRealTimers()
})

describe("saving before recovery reloads", () => {
  it("honors a failed final checkpoint after the editor unmounts into an error boundary", async () => {
    const detach = registerReloadCheckpoint(() => ({
      localSaved: true,
      cloudSaved: Promise.resolve(true),
    }))
    detach({ localSaved: false, cloudSaved: Promise.resolve(false) })
    const reload = vi.fn(),
      blocked = vi.fn()
    reloadAfterCheckpoint(reload, blocked)
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).not.toHaveBeenCalled()
    expect(blocked).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(10000)
    reloadAfterCheckpoint(reload, blocked)
    expect(reload).toHaveBeenCalledOnce()
  })
  it("checkpoints synchronously and gives cloud backup a bounded chance", async () => {
    const order: string[] = []
    unregister = registerReloadCheckpoint(() => {
      order.push("local")
      return { localSaved: true, cloudSaved: new Promise(() => {}) }
    })
    reloadAfterCheckpoint(() => order.push("reload"), vi.fn())
    expect(order).toEqual(["local"])
    await vi.advanceTimersByTimeAsync(1500)
    expect(order).toEqual(["local", "reload"])
  })
  it("allows recovery with cloud backup when device storage is unavailable", async () => {
    unregister = registerReloadCheckpoint(() => ({
      localSaved: false,
      cloudSaved: Promise.resolve(true),
    }))
    const reload = vi.fn()
    reloadAfterCheckpoint(reload, vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).toHaveBeenCalledOnce()
  })
  it("keeps the page open when neither backup is available", async () => {
    unregister = registerReloadCheckpoint(() => ({
      localSaved: false,
      cloudSaved: Promise.reject(new Error("offline")),
    }))
    const reload = vi.fn(),
      blocked = vi.fn()
    reloadAfterCheckpoint(reload, blocked)
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).not.toHaveBeenCalled()
    expect(blocked).toHaveBeenCalledOnce()
  })
  it("does not reload a new attempt after an older attempt's delayed checkpoint", async () => {
    const reload = vi.fn()
    unregister = registerReloadCheckpoint(() => ({
      localSaved: true,
      cloudSaved: new Promise(() => {}),
    }))
    reloadAfterCheckpoint(reload, vi.fn())
    unregister()
    unregister = registerReloadCheckpoint(() => ({
      localSaved: true,
      cloudSaved: Promise.resolve(true),
    }))
    await vi.advanceTimersByTimeAsync(1500)
    expect(reload).not.toHaveBeenCalled()
  })
  it("remains usable outside a session and tolerates stale cleanup", () => {
    const old = registerReloadCheckpoint(() => {
      throw new Error("old")
    })
    unregister = registerReloadCheckpoint(() => {
      throw new Error("current")
    })
    old()
    const reload = vi.fn(),
      blocked = vi.fn()
    reloadAfterCheckpoint(reload, blocked)
    expect(blocked).toHaveBeenCalledOnce()
    unregister()
    reloadAfterCheckpoint(reload, blocked)
    expect(reload).toHaveBeenCalledOnce()
  })
})
