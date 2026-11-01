import { expect, test } from "@playwright/test"
import { join } from "node:path"
import { bugfixRateLimiterErrorHandlingScenario as scenario } from "../../lib/scenarios/real-world/bugfix/bugfix-rate-limiter-error-handling"
import { sealed } from "../../lib/scenarios/sealed/legacy/bugfix-rate-limiter-error-handling.server"
import { bugfixRateLimiterErrorHandlingPythonScenario as python } from "../../lib/scenarios/real-world/bugfix/bugfix-rate-limiter-error-handling-python"
import { sealed as pythonSealed } from "../../lib/scenarios/sealed/legacy/bugfix-rate-limiter-error-handling-python.server"
import { parseWorkspaceExecutionOutput } from "../../lib/workspace-execution/result-parser"

for (const density of ["cards", "rows"]) {
  for (const width of [1440, 375]) {
    test(`Python choice and concept dialog work in ${density} at ${width}px`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto(`/?view=picker&track=debugging&theme=${width === 375 ? "light" : "dark"}`)
      await page
        .getByRole("button", { name: density === "rows" ? "List view" : "Card view", exact: true })
        .click()
      await page.getByRole("searchbox", { name: "Search problems" }).fill(scenario.title)
      const results = page.getByRole("region", { name: "Practice problems" })
      await expect(results.getByRole("heading", { name: scenario.title, exact: true })).toHaveCount(
        1
      )
      const chooser = results.getByRole("combobox", {
        name: `Practice language for ${scenario.title}`,
      })
      await expect(chooser).toContainText("JavaScript")
      await chooser.click()
      await page.getByRole("option", { name: "Python", exact: true }).click()
      await expect(chooser).toContainText("Python")
      await page.screenshot({ path: testInfo.outputPath("language-choice.png") })
      await results.getByRole("button", { name: /^Start practice:/ }).click()
      await expect(page).toHaveURL(/scenario=bugfix-rate-limiter-error-handling-python/)
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await expect(
        page.getByRole("treeitem", { name: "Open editable file: src/rate_limiter.py" })
      ).toBeVisible()
      const explanation = page.getByRole("button", {
        name: "Exception handling: quick explanation",
        exact: true,
      })
      await expect(explanation).toBeVisible()
      await explanation.focus()
      await page.keyboard.press("Enter")
      const dialog = page.getByRole("dialog", { name: "Exception handling", exact: true })
      await expect(dialog).toContainText("A timeout means a reply did not arrive")
      await expect(dialog).not.toContainText("except StoreUnavailableError")
      await page.screenshot({ path: testInfo.outputPath("concept-dialog.png") })
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await expect(explanation).toBeFocused()
      await page.getByRole("treeitem", { name: "Open documentation file: task.md" }).click()
      await page.getByRole("button", { name: "Make readable" }).click()
      const task = page.getByRole("article", { name: "task.md preview" })
      await expect(task).toContainText("Concept: Exception handling")
      await expect(task).toContainText("Every other exception must propagate unchanged")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      expect(errors).toEqual([])
    })
  }
}

test("the shipped Python worker reproduces and fixes the exception bug on successive runs", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.route("**/workers/python-sandbox-worker.js", (route) =>
    route.fulfill({
      path: join(process.cwd(), "public/workers/python-sandbox-worker.js"),
      contentType: "application/javascript",
    })
  )
  await page.goto("/?view=picker&track=debugging")
  const runs = [false, true, false].map((fixed) => ({
    files: python.workspace!.files.map(({ path, content }) => ({
      path,
      content:
        fixed && path === pythonSealed.referenceFiles[0].path
          ? pythonSealed.referenceFiles[0].content
          : content,
    })),
    entrypoint: python.workspace!.testRunnerPath!,
  }))
  const executions = await page.evaluate(async (runs) => {
    const worker = new Worker("/workers/python-sandbox-worker.js")
    try {
      const responses = []
      for (const run of runs) {
        responses.push(
          await new Promise<{ success: boolean; error?: string; logs: { message: string }[] }>(
            (resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error("Python worker did not finish")),
                90_000
              )
              worker.onerror = (event) => {
                clearTimeout(timeout)
                reject(new Error(event.message))
              }
              worker.onmessage = (event) => {
                if (event.data.type !== "result") return
                clearTimeout(timeout)
                resolve(event.data)
              }
              worker.postMessage(run)
            }
          )
        )
      }
      return responses
    } finally {
      worker.terminate()
    }
  }, runs)
  for (const [index, execution] of executions.entries()) {
    expect(execution.success, execution.error).toBe(true)
    const results = parseWorkspaceExecutionOutput(
      execution.logs.map(({ message }) => message).join("\n")
    ).results
    expect(results).toHaveLength(12)
    if (index === 1) expect(results.filter(({ passed }) => !passed)).toEqual([])
    else
      expect(
        results.find(({ name }) => name === "a storage outage does not admit an unverified request")
          ?.passed
      ).toBe(false)
  }
})

test("the exception-handling question opens with its prerequisites and complete public contract", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/?view=picker&track=debugging")
    await page.getByRole("searchbox", { name: "Search problems" }).fill(scenario.title)
    const results = page.getByRole("region", { name: "Practice problems" })
    await expect(results.getByRole("heading", { name: scenario.title, exact: true })).toBeVisible()
    await results.getByRole("button", { name: /^Prerequisites for/ }).click()
    await expect(results.getByText("Exception handling", { exact: true })).toBeVisible()
    await results.getByRole("button", { name: /^Start practice:/ }).click()
    if (width < 1024) await page.getByRole("button", { name: "Show problem", exact: true }).click()
    await page.getByRole("treeitem", { name: "Open documentation file: task.md" }).click()
    await page.getByRole("button", { name: "Make readable" }).click()
    const task = page.getByRole("article", { name: "task.md preview" })
    await expect(task).toContainText("Every other thrown value must propagate unchanged")
    await expect(task).toContainText("A write timeout may occur after the reservation committed")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
})

test("the shipped browser worker reproduces the exception bug and verifies the reference fix", async ({
  page,
}) => {
  for (const script of ["js-sandbox-worker.js", "assert-shim.js", "vitest-shim.js"]) {
    await page.route(`**/workers/${script}`, (route) =>
      route.fulfill({
        path: join(process.cwd(), "public/workers", script),
        contentType: "application/javascript",
      })
    )
  }
  await page.goto("/?view=picker&track=debugging")
  const reference = sealed.referenceFiles[0]
  for (const fixed of [false, true]) {
    const files = scenario.workspace!.files.map((file) => ({
      path: file.path,
      content: fixed && file.path === reference.path ? reference.content : file.content,
    }))
    const execution = await page.evaluate(
      ({ files, entrypoint }) =>
        new Promise<{
          success: boolean
          error?: string
          logs: { message: string }[]
        }>((resolve, reject) => {
          const worker = new Worker("/workers/js-sandbox-worker.js")
          const timeout = setTimeout(() => {
            worker.terminate()
            reject(new Error("worker did not finish"))
          }, 10000)
          worker.onerror = (event) => {
            clearTimeout(timeout)
            worker.terminate()
            reject(new Error(event.message))
          }
          worker.onmessage = (event) => {
            clearTimeout(timeout)
            worker.terminate()
            resolve(event.data)
          }
          worker.postMessage({ files, entrypoint })
        }),
      { files, entrypoint: scenario.workspace!.testRunnerPath! }
    )
    expect(execution.success, execution.error).toBe(true)
    const results = parseWorkspaceExecutionOutput(
      execution.logs.map((log) => log.message).join("\n")
    ).results
    expect(results).toHaveLength(12)
    if (fixed) expect(results.filter((result) => !result.passed)).toEqual([])
    else {
      expect(
        results.find(
          (result) => result.name === "healthy single requests and bursts respect the plan"
        )?.passed
      ).toBe(true)
      expect(
        results.find(
          (result) => result.name === "a storage outage does not admit an unverified request"
        )?.passed
      ).toBe(false)
      expect(
        results.find(
          (result) => result.name === "an unexpected error remains visible to the caller"
        )?.passed
      ).toBe(false)
    }
  }
})
