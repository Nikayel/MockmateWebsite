/**
 * Reachability guard for the System Design drill bank.
 *
 * The failure this exists to stop has bitten this repo three times: a module is correct, complete,
 * and never called, so the thing it exposes is unreachable and nothing notices. Moving the 12
 * system-design scenarios out of the interview browser makes this section their ONLY entry point,
 * which turns "reachable" into a property worth asserting rather than a thing to eyeball.
 *
 * So this asserts ids, not a count. A count passes while a scenario silently swaps for another, and
 * it passes while the section is authored but never mounted on the page.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { scenarios } from "@/lib/scenarios"
import { getScenarioById } from "@/lib/scenarios/index"
import type { SystemDesignScenario } from "@/lib/scenarios/types"
import { SystemDesignDrills, listSystemDesignDrills } from "../SystemDesignDrills"

const registryDrills = scenarios.filter(
  (scenario): scenario is SystemDesignScenario => scenario.type === "system-design"
)

const html = renderToStaticMarkup(createElement(SystemDesignDrills))

/** `renderToStaticMarkup` escapes the `&` in the query string, so read hrefs back decoded. */
const renderedHrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
  match[1].replaceAll("&amp;", "&")
)

describe("SystemDesignDrills", () => {
  it("has a real registry to work from", () => {
    // Guards the guard: an empty filter would make every id assertion below vacuously true.
    expect(registryDrills.length).toBeGreaterThan(1)
  })

  it("derives its list from the registry with nothing dropped or added", () => {
    expect(new Set(listSystemDesignDrills().map((drill) => drill.id))).toEqual(
      new Set(registryDrills.map((drill) => drill.id))
    )
  })

  it("renders one card per scenario, linked by id", () => {
    for (const drill of registryDrills) {
      expect(renderedHrefs).toContain(`/interview?scenario=${drill.id}&practice=true`)
    }
    expect(renderedHrefs).toHaveLength(registryDrills.length)
  })

  it("shows each scenario's own title, time, and description", () => {
    for (const drill of registryDrills) {
      expect(html).toContain(drill.title)
      expect(html).toContain(drill.description)
      expect(html).toContain(`${drill.estimatedTime} min`)
    }
  })

  /**
   * `practice=true` is load-bearing, not decoration. `useSessionReopen` ignores a bare `?scenario=`
   * and only takes over the route when `practice=true` or `roadmap=true` rides along
   * (app/interview/_hooks/useSessionReopen.ts:374). Without it every card lands on the browser.
   */
  it("carries the practice flag the interview route needs to honour the deep link", () => {
    for (const href of renderedHrefs) {
      expect(href).toMatch(/^\/interview\?scenario=[\w-]+&practice=true$/)
    }
  })

  it("resolves every linked id through the loader the interview route actually uses", async () => {
    for (const drill of registryDrills) {
      const resolved = await getScenarioById(drill.id)
      expect(resolved?.id, `${drill.id} is linked but the interview route cannot load it`).toBe(
        drill.id
      )
    }
  })

  /**
   * Authoring the section is not shipping it. This is the cheapest honest check that the course page
   * actually mounts the component, which is precisely the step the past regressions skipped.
   */
  it("is mounted on the System Design course page", () => {
    const page = readFileSync(join(process.cwd(), "app/learn/system-design/page.tsx"), "utf8")
    expect(page).toContain("SystemDesignDrills")
    expect(page).toContain("<SystemDesignDrills />")
  })
})
