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
  vi.stubGlobal("window", {
    location: { search, pathname: "/learn/python/lists", hostname: "www.codesparring.dev" },
    localStorage,
  })
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

  it("captures an untagged direct landing", () => {
    installDom("?page=2&sort=asc")
    captureAttribution()
    expect(getAttribution()).toMatchObject({
      source: "direct",
      medium: "none",
      landingPage: "/learn/python/lists",
    })
  })

  it("flattens attribution into analytics params", () => {
    installDom("?utm_source=google&utm_medium=cpc")
    captureAttribution()
    expect(getAttributionParams()).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      acquisition_source: "google",
      acquisition_medium: "cpc",
      acquisition_landing_page: "/learn/python/lists",
    })
  })

  it("returns empty params on the server", () => {
    vi.stubGlobal("window", undefined)
    expect(getAttributionParams()).toEqual({})
  })

  it("captures Google search before the first event, without leaking referrer queries", () => {
    installDom("", "https://www.google.com/search?q=private+query")
    expect(getAttributionParams()).toMatchObject({
      acquisition_source: "google",
      acquisition_medium: "organic",
      acquisition_landing_page: "/learn/python/lists",
      acquisition_referrer: "https://www.google.com",
    })
    expect(JSON.stringify(getAttribution())).not.toContain("private")
  })

  it("does not replace an organic first touch with a later campaign", () => {
    installDom("", "https://www.google.co.uk/search?q=lists")
    captureAttribution()
    window.location.search = "?utm_source=reddit&utm_medium=paid"
    captureAttribution()
    expect(getAttribution()).toMatchObject({ source: "google", medium: "organic" })
  })

  it("keeps tagged paid traffic distinct from an organic referrer", () => {
    installDom("?utm_source=google&utm_medium=cpc", "https://www.google.com/")
    captureAttribution()
    expect(getAttribution()).toMatchObject({ source: "google", medium: "cpc" })
  })

  it("captures external referral domains", () => {
    installDom("", "https://www.reddit.com/r/programming?secret=hidden")
    captureAttribution()
    expect(getAttribution()).toMatchObject({
      source: "reddit.com",
      medium: "referral",
      referrer: "https://www.reddit.com",
    })
  })

  it.each(["https://codesparring.dev/pricing", "invalid", "javascript:alert(1)"])(
    "treats internal or invalid referrers as direct: %s",
    (referrer) => {
      installDom("", referrer)
      captureAttribution()
      expect(getAttribution()).toMatchObject({ source: "direct", medium: "none" })
      expect(getAttribution()?.referrer).toBeUndefined()
    }
  )

  it("does not mistake a lookalike Google hostname for organic search", () => {
    installDom("", "https://google.com.example.org/")
    captureAttribution()
    expect(getAttribution()?.medium).toBe("referral")
  })

  it("remains safe when browser storage is blocked", () => {
    installDom("", "https://www.google.com/")
    window.localStorage.setItem = () => {
      throw new Error("blocked")
    }
    expect(() => captureAttribution()).not.toThrow()
    expect(getAttributionParams()).toEqual({})
  })

  it("caps overly long utm values to prevent storage bloat", () => {
    const long = "x".repeat(5000)
    installDom(`?utm_source=${long}`)
    captureAttribution()
    expect(getAttribution()?.source?.length).toBe(200)
  })
})
