import { expect, test, type Page } from "@playwright/test"

async function reachFocus(page: Page) {
  await page.goto("/?view=roadmap-assessment")
  await page.getByRole("button", { name: /^Beginner/ }).click()
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("heading", { name: "Which Engineering Track?" })).toBeVisible()
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(
    page.getByRole("heading", { name: "What Should Your Roadmap Focus On?" })
  ).toBeVisible()
}

for (const width of [1366, 375]) {
  test(`recommended assessment generates a balanced plan at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await reachFocus(page)
    await expect(page.getByRole("button", { name: /Debugging \+ algorithms/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await page.screenshot({
      path: testInfo.outputPath(`roadmap-focus-${width}.png`),
      fullPage: true,
    })
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(
      page.getByRole("heading", { name: "How Many Problems Have You Solved?" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(
      page.getByRole("heading", { name: "How Much Time Can You Study Daily?" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("heading", { name: "Rate Your Pattern Knowledge" })).toBeVisible()
    for (const button of (await page.getByRole("button", { name: "New", exact: true }).all()).slice(
      0,
      4
    ))
      await button.click()
    await page.getByRole("button", { name: "Generate Roadmap" }).click()
    await expect(page.getByRole("region", { name: "Generated roadmap" })).toBeVisible()
    const debugging = Number(await page.getByTestId("debugging-count").textContent())
    const algorithms = Number(await page.getByTestId("algorithms-count").textContent())
    expect(debugging).toBeGreaterThan(0)
    expect(debugging).toBe(algorithms)
    await expect(page.getByText("Google-style · Code comprehension")).toBeVisible()
    expect(errors).toEqual([])
  })
}

test("debugging-only choice skips DSA assessment and schedules only debugging", async ({
  page,
}) => {
  await reachFocus(page)
  await page.getByRole("button", { name: /^Custom/ }).click()
  await page.getByRole("button", { name: "Algorithms", exact: true }).click()
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(
    page.getByRole("heading", { name: "How Much Time Can You Study Daily?" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Generate Roadmap" }).click()
  await expect(page.getByRole("region", { name: "Generated roadmap" })).toBeVisible()
  expect(Number(await page.getByTestId("debugging-count").textContent())).toBeGreaterThan(0)
  await expect(page.getByTestId("algorithms-count")).toHaveText("0")
})
