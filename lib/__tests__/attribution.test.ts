import { describe, it, expect, afterEach, vi } from "vitest"
import { captureAttribution, getAttribution, getAttributionParams } from "../attribution"

function installDom(search: string, referrer = "") {
  const store: Record<string, string> = {}
  const localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
  }
  vi.stubGlobal("window", { location: { search, pathname: "/" }, localStorage })
  vi.stubGlobal("document", { referrer })
  return store
}

afterEach(() => vi.unstubAllGlobals())

describe("attribution", () => {
  it("captures utm params on first touch", () => {
    installDom("?utm_source=reddit&utm_medium=community&utm_campaign=launch")
    captureAttribution()
    expect(getAttribution()).toMatchObject({
      source: "reddit",
      medium: "community",
      campaign: "launch",
    })
  })

  it("is first-touch: a later source does not overwrite the original", () => {
    const store = installDom("?utm_source=reddit")
    captureAttribution()
    // Simulate a second visit from a different channel, same storage.
    vi.stubGlobal("window", {
      location: { search: "?utm_source=google", pathname: "/" },
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v
        },
        removeItem: () => {},
        clear: () => {},
      },
    })
    captureAttribution()
    expect(getAttribution()?.source).toBe("reddit")
  })

  it("captures a ?ref= referral code as first-touch attribution", () => {
    installDom("?ref=FRIEND123")
    captureAttribution()
    expect(getAttribution()).toMatchObject({
      source: "referral",
      campaign: "FRIEND123",
    })
  })

  it("captures a ?src= campus link with medium campaign", () => {
    installDom("?src=campus_qr")
    captureAttribution()
    expect(getAttribution()).toMatchObject({
      source: "campus_qr",
      medium: "campaign",
    })
  })

  it("lets explicit utm_source win over ?ref= on the same landing", () => {
    installDom("?ref=FRIEND123&utm_source=reddit")
    captureAttribution()
    expect(getAttribution()?.source).toBe("reddit")
  })

  it("src and ref landings do not overwrite an existing first touch", () => {
    const store = installDom("?src=flyer")
    captureAttribution()
    // A later referral landing reuses the same storage.
    vi.stubGlobal("window", {
      location: { search: "?ref=CODE9", pathname: "/" },
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v
        },
        removeItem: () => {},
        clear: () => {},
      },
    })
    captureAttribution()
    expect(getAttribution()?.source).toBe("flyer")
  })

  it("does nothing when there are no attribution params", () => {
    installDom("?page=2&sort=asc")
    captureAttribution()
    expect(getAttribution()).toBeNull()
  })

  it("flattens attribution into analytics params", () => {
    installDom("?utm_source=google&utm_medium=cpc")
    captureAttribution()
    expect(getAttributionParams()).toEqual({ utm_source: "google", utm_medium: "cpc" })
  })

  it("returns empty params when no attribution exists", () => {
    installDom("")
    expect(getAttributionParams()).toEqual({})
  })

  it("caps overly long utm values to prevent storage bloat", () => {
    const long = "x".repeat(5000)
    installDom(`?utm_source=${long}`)
    captureAttribution()
    expect(getAttribution()?.source?.length).toBe(200)
  })
})
