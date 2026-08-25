/**
 * @vitest-environment jsdom
 *
 * What happens when the visitor answers the banner and the browser refuses to
 * remember it.
 *
 * `savePreferences` used to call `localStorage.setItem` first and unguarded, so
 * a throw skipped the three lines under it: the banner never closed, the
 * consentUpdated event never fired, and the choice was dropped. From the
 * visitor's side the button did nothing at all, which PostHog recorded as a
 * dead click on "Accept All".
 *
 * setItem throws for reasons that have nothing to do with intent: Safari
 * private mode, a full quota, storage blocked by tracking prevention or by an
 * enterprise policy. None of those are a reason to ignore someone who just
 * clicked Accept.
 */

import { fireEvent, render, screen, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const trackEvent = vi.fn()
vi.mock("@/lib/analytics", () => ({
  trackEvent: (name: string, params?: Record<string, unknown>) => trackEvent(name, params),
}))

const STORAGE_KEY = "codesparring_cookie_consent"

/** The banner appears on a 1s timer, so every test has to run the clock out. */
async function showBanner() {
  const { CookieConsent } = await import("@/components/CookieConsent")
  render(<CookieConsent />)
  await act(async () => {
    vi.advanceTimersByTime(1100)
  })
}

describe("CookieConsent when storage refuses the write", () => {
  let consentEvents: Array<{ analytics: boolean }> = []
  const collect = (e: Event) =>
    consentEvents.push((e as CustomEvent<{ analytics: boolean }>).detail)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.clear()
    consentEvents = []
    window.addEventListener("consentUpdated", collect)
  })

  afterEach(() => {
    // Without this every test leaves a listener behind, and since they all
    // close over the same binding a single dispatch lands in the array once per
    // test that has run so far.
    window.removeEventListener("consentUpdated", collect)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("closes the banner even though the choice could not be stored", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })

    await showBanner()
    fireEvent.click(screen.getByRole("button", { name: "Accept All" }))

    // The dead click: before the guard, the banner was still on screen here.
    expect(screen.queryByRole("button", { name: "Accept All" })).toBeNull()
  })

  it("still applies the choice for this page load", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })

    await showBanner()
    fireEvent.click(screen.getByRole("button", { name: "Accept All" }))

    // ConsentAnalytics listens for this and reads `detail`, so consent takes
    // effect now even though nothing was written to the device.
    expect(consentEvents).toEqual([expect.objectContaining({ analytics: true })])
  })

  it("records that the write failed, so the gap is countable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })

    await showBanner()
    fireEvent.click(screen.getByRole("button", { name: "Accept All" }))

    expect(trackEvent).toHaveBeenCalledWith("consent_choice", {
      analytics: true,
      persisted: false,
    })
  })
})

describe("CookieConsent on the happy path", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("stores the choice and reports it as persisted", async () => {
    await showBanner()
    fireEvent.click(screen.getByRole("button", { name: "Accept All" }))

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({
      analytics: true,
      functional: true,
      necessary: true,
    })
    expect(trackEvent).toHaveBeenCalledWith("consent_choice", {
      analytics: true,
      persisted: true,
    })
  })

  it("reports a decline as a decline rather than as an absence", async () => {
    await showBanner()
    fireEvent.click(screen.getByRole("button", { name: "Necessary Only" }))

    expect(trackEvent).toHaveBeenCalledWith("consent_choice", {
      analytics: false,
      persisted: true,
    })
  })

  it("counts the banner being shown, so a silent zero can be told from a bug", async () => {
    await showBanner()

    expect(trackEvent).toHaveBeenCalledWith("consent_prompt_shown", undefined)
  })

  it("does not show the banner, or count a prompt, to someone who already chose", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: true,
        functional: true,
        version: "1.0",
        timestamp: "2026-08-25T00:00:00.000Z",
      })
    )

    await showBanner()

    expect(screen.queryByRole("button", { name: "Accept All" })).toBeNull()
    expect(trackEvent).not.toHaveBeenCalledWith("consent_prompt_shown", undefined)
  })
})

describe("getConsentState", () => {
  beforeEach(() => localStorage.clear())

  it("separates never-asked from declined", async () => {
    const { getConsentState } = await import("@/components/CookieConsent")

    expect(getConsentState()).toBe("unanswered")

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ necessary: true, analytics: false, functional: false, version: "1.0" })
    )
    expect(getConsentState()).toBe("declined")

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ necessary: true, analytics: true, functional: true, version: "1.0" })
    )
    expect(getConsentState()).toBe("granted")
  })

  it("treats a stale policy version as never-asked, so the visitor is re-prompted", async () => {
    const { getConsentState } = await import("@/components/CookieConsent")

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ necessary: true, analytics: true, functional: true, version: "0.9" })
    )

    expect(getConsentState()).toBe("unanswered")
  })
})
