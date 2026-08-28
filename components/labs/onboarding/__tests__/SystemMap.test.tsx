/**
 * SystemMap renders to static markup with no effects (so no WebGL): it starts in
 * "pending" mode and emits the tile host plus one HTML label per module. This
 * can't catch the z-index occlusion bug (jsdom doesn't paint), but it does pin
 * that every module contributes a visible name element — the thing that reads as
 * "the card" — so a refactor that drops the labels fails here.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SystemMap } from "@/components/labs/onboarding/SystemMap"

const modules = [
  { id: "http", label: "the front door", role: "receives requests", path: "src/http" },
  { id: "money", label: "money", role: "rounds dollars", path: "src/money" },
  { id: "db", label: "persistence", role: "one query interface", path: "src/db" },
]

describe("SystemMap", () => {
  const html = renderToStaticMarkup(<SystemMap modules={modules} />)

  it("emits a name label for every module", () => {
    for (const mod of modules) {
      expect(html).toContain(mod.label)
    }
  })

  it("labels carry the class the render loop positions and lifts above the canvas", () => {
    // Three tiles -> three positioned label elements.
    const count = html.split("lab-onb-map-tile-label").length - 1
    expect(count).toBe(modules.length)
  })
})
