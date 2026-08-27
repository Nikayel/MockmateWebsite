/**
 * Tests for the structural deep-equal the gate runner uses to compare a
 * client-posted io-case output against the sealed `expected` value. Inputs
 * are always JSON-compatible (io-cases are authored as YAML data, per
 * WORKBOOK-SPEC.md §6) — objects, arrays, strings, numbers, booleans, null.
 */

import { describe, expect, it } from "vitest"
import { deepEqual } from "../deep-equal"

describe("deepEqual", () => {
  it.each([
    [1, 1, true],
    [1, 2, false],
    ["a", "a", true],
    ["a", "b", false],
    [true, true, true],
    [true, false, false],
    [null, null, true],
    [null, undefined, false],
    [undefined, undefined, true],
    [0, false, false],
    ["1", 1, false],
  ])("primitive %j vs %j -> %s", (a, b, expected) => {
    expect(deepEqual(a, b)).toBe(expected)
  })

  it("compares plain objects by value, independent of key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })

  it("detects a differing value on a shared key", () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  it("detects a missing key on either side", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it("recurses into nested objects", () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
  })

  it("compares arrays by value AND order", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
  })

  it("recurses into arrays of objects", () => {
    expect(deepEqual([{ id: "a" }, { id: "b" }], [{ id: "a" }, { id: "b" }])).toBe(true)
    expect(deepEqual([{ id: "a" }], [{ id: "b" }])).toBe(false)
  })

  it("treats an array and an object as unequal even with similar-looking contents", () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
  })

  it("returns true for two identical empty objects or arrays", () => {
    expect(deepEqual({}, {})).toBe(true)
    expect(deepEqual([], [])).toBe(true)
  })
})
