import { describe, expect, it } from "vitest"
import { formatMoney, parseMoney, toWireAmountV1 } from "../../src/money/money"

describe("parseMoney", () => {
  it("parses an exact two-decimal USD amount into cents", () => {
    const result = parseMoney({ amount: 412.19, currency: "USD" })
    expect(result).toEqual({ ok: true, value: { minorUnits: 41219, currency: "USD" } })
  })

  it("parses a whole-dollar amount into cents with no fractional remainder", () => {
    const result = parseMoney({ amount: 500, currency: "USD" })
    expect(result).toEqual({ ok: true, value: { minorUnits: 50000, currency: "USD" } })
  })

  it("parses an amount in a zero-decimal currency with no scaling", () => {
    const result = parseMoney({ amount: 1500, currency: "JPY" })
    expect(result).toEqual({ ok: true, value: { minorUnits: 1500, currency: "JPY" } })
  })

  it("parses an amount in a three-decimal currency exactly", () => {
    const result = parseMoney({ amount: 12.345, currency: "BHD" })
    expect(result).toEqual({ ok: true, value: { minorUnits: 12345, currency: "BHD" } })
  })

  it("rejects an amount with more precision than the currency's minor unit holds", () => {
    const result = parseMoney({ amount: 412.995, currency: "USD" })
    expect(result.ok).toBe(false)
  })

  it("rejects a whole number sent to a zero-decimal currency with a fractional remainder", () => {
    const result = parseMoney({ amount: 1500.5, currency: "JPY" })
    expect(result.ok).toBe(false)
  })

  it("rejects a non-numeric amount", () => {
    const result = parseMoney({ amount: "412.19", currency: "USD" })
    expect(result.ok).toBe(false)
  })

  it("rejects a missing currency", () => {
    const result = parseMoney({ amount: 100, currency: undefined })
    expect(result.ok).toBe(false)
  })

  it("rejects a non-finite amount", () => {
    expect(parseMoney({ amount: Infinity, currency: "USD" }).ok).toBe(false)
    expect(parseMoney({ amount: NaN, currency: "USD" }).ok).toBe(false)
  })

  it("falls back to a two-decimal scale for a currency missing from the table", () => {
    const result = parseMoney({ amount: 19.99, currency: "XYZ" })
    expect(result).toEqual({ ok: true, value: { minorUnits: 1999, currency: "XYZ" } })
  })
})

describe("formatMoney", () => {
  it("formats a USD amount to exactly two decimal places", () => {
    expect(formatMoney({ minorUnits: 41219, currency: "USD" })).toBe("USD 412.19")
  })

  it("formats a JPY amount with no decimal point", () => {
    expect(formatMoney({ minorUnits: 1500, currency: "JPY" })).toBe("JPY 1500")
  })

  it("formats a round dollar amount with trailing zeros, never dropped", () => {
    expect(formatMoney({ minorUnits: 50000, currency: "USD" })).toBe("USD 500.00")
  })
})

describe("toWireAmountV1", () => {
  it("round-trips an exact cent amount back to the same decimal that was parsed", () => {
    const parsed = parseMoney({ amount: 412.19, currency: "USD" })
    if (!parsed.ok) throw new Error("expected parseMoney to succeed")
    expect(toWireAmountV1(parsed.value)).toBe(412.19)
  })

  it("round-trips a three-decimal currency amount exactly", () => {
    expect(toWireAmountV1({ minorUnits: 12345, currency: "BHD" })).toBe(12.345)
  })
})
