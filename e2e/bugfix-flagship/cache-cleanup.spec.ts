import { test, expect } from "@playwright/test"
import { genericCacheEvictionMutationPack as pack } from "../../lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation"

test("real browser worker reproduces, runs edited sibling modules, and keeps edits across file switches", async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  const cards = page.locator("h3")
  await expect(cards.nth(1)).toHaveText(pack.title)
  const card = page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: pack.title }) })
  await expect(card.getByText("Fix + extend")).toBeVisible()
  await card.getByRole("button", { name: "Start" }).click()
  await expect(page.getByTestId("active-file")).toHaveText("src/cache_sweep.py")
  await page.getByRole("button", { name: "Run report", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("sessions: 3", { timeout: 65_000 })
  await expect(page.getByRole("status")).toContainText("feed: 1")
  await expect(page.getByRole("status")).toContainText("Regression checks: 6/12 passed")
  await page.getByRole("treeitem", { name: /src\/cache_store.py/ }).click()
  const original = pack.srcFiles.find((file) => file.path === "src/cache_store.py")!.content
  const fixed = original.replace("        index += 1", "        else:\n            index += 1")
  const editor = page.locator(".cm-content")
  await editor.fill(fixed)
  await page.getByRole("treeitem", { name: /src\/log_reader.py/ }).click()
  await page.getByRole("treeitem", { name: /src\/cache_store.py/ }).click()
  await expect(editor).toContainText("else:")
  await page.getByRole("button", { name: "Run report", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Report differs")
  await expect(page.getByRole("status")).toContainText("sessions: 2")
  await expect(page.getByRole("status")).toContainText("feed: 1")
  await expect(page.getByRole("status")).toContainText("refreshed key: FAIL")
  // The old one-else patch must not finish this incident. Repair replay in the
  // second module and run the same read-only checks through the real worker.
  await page.getByRole("treeitem", { name: /src\/log_reader.py/ }).click()
  const reader = pack.srcFiles.find((file) => file.path === "src/log_reader.py")!.content
  await editor.fill(
    reader
      .replace("    seen = set()\n", "")
      .replace(
        '                identity = (event["namespace"], event["key"])\n                if identity in seen:\n                    continue\n                seen.add(identity)\n',
        ""
      )
  )
  await page.getByRole("button", { name: "Run report", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Report matches")
  await expect(page.getByRole("status")).toContainText("Regression checks: 12/12 passed")
  await expect(page.getByRole("status")).toContainText("feed: 2")
  await page.getByRole("treeitem", { name: /fixtures\/regression_checks.py/ }).click()
  await expect(editor).toHaveAttribute("contenteditable", "false")
  await page.getByRole("treeitem", { name: /fixtures\/input.txt/ }).click()
  await expect(editor).toHaveAttribute("contenteditable", "false")
  await expect(page.getByRole("treeitem", { name: /oracle.json/ })).toHaveCount(0)
  expect(errors).toEqual([])
})

test("the flagship cue works in both densities without overflowing mobile or enlarged text", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const theme of ["light", "dark"]) {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto(`/?theme=${theme}`)
      await expect(page.getByText("Fix + extend")).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${viewport.width}-cards.png`) })
      await page.getByRole("button", { name: "List view" }).click()
      await expect(page.getByText("Fix + extend")).toBeVisible()
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "24px"
      })
      // No document overflow is insufficient: a flex row can hide its title entirely.
      const titleBounds = await page.getByText(pack.title, { exact: true }).boundingBox()
      expect(titleBounds?.width).toBeGreaterThan(100)
      expect(titleBounds?.height).toBeGreaterThan(20)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${viewport.width}-rows-large-text.png`),
      })
      await page.getByRole("button", { name: "Card view" }).click()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
    }
  }
})
