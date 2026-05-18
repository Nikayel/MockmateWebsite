import { describe, expect, it } from "vitest"
import { removeUndefinedValues } from "../services/helpers"

describe("RAG service helpers", () => {
  describe("removeUndefinedValues", () => {
    it("removes only undefined top-level values before Firestore writes", () => {
      expect(
        removeUndefinedValues({
          keepNull: null,
          keepFalse: false,
          keepZero: 0,
          removeMe: undefined,
          nested: {
            value: undefined,
          },
        })
      ).toEqual({
        keepNull: null,
        keepFalse: false,
        keepZero: 0,
        nested: {
          value: undefined,
        },
      })
    })
  })
})
