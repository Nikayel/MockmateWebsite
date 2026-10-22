import { test, expect } from "@playwright/test"
import { installGuestBackend } from "./guest-trial/backend"
import { prepareGuestSubmission, TWO_SUM_SOLUTION } from "./guest-trial/flow"

/**
 * Real production UI, hooks and in-browser execution, with a contract-validated
 * guest persistence fixture. CI has no Firebase credentials. A failed create
 * cannot stand in for a saved session: signup requires a durable recovery point.
 * Firebase API authorization/validation is covered in app/api/guest-session tests;
 * authenticated conversion needs a seeded auth emulator and is outside this spec.
 */
test.use({ actionTimeout: 20_000, trace: "retain-on-failure", screenshot: "only-on-failure" })

test.describe("Guest trial journey (pre-auth)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000)
    await page.route("**/ingest/**", (route) => route.abort())
  })

  test("saves the submission before offering signup and the account button reopens the dialog", async ({
    page,
  }) => {
    const backend = await installGuestBackend(page)
    await prepareGuestSubmission(page)
    await page.getByRole("button", { name: "Submit solution", exact: true }).click()

    const lockHeading = page.getByRole("heading", {
      name: "Continue with your interviewer",
      exact: true,
    })
    await expect(lockHeading).toBeVisible()
    expect(backend.acceptedCheckpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: backend.sessionId,
          sessionState: expect.objectContaining({
            code: TWO_SUM_SOLUTION,
            language: "javascript",
            isPostInterviewDiscussion: true,
            testSummary: expect.objectContaining({ failed: 0, passRate: 100 }),
          }),
        }),
      ])
    )
    // Pre-auth is a saved submission, not a completed/scored interview.
    expect(backend.writes.every((body) => body.performanceScore === undefined)).toBe(true)
    const continueButton = page.getByRole("button", {
      name: "Create account & continue",
      exact: true,
    })
    await expect(continueButton).toBeVisible()
    await expect(page.getByRole("dialog")).toBeHidden()
    await continueButton.click()
    const signupDialog = page.getByRole("dialog")
    await expect(signupDialog).toBeVisible()
    await expect(signupDialog.getByText(/create your free account/i)).toBeVisible()
    await expect(signupDialog.getByText(/\d+\s*%/)).toHaveCount(0)
    await expect(page.getByText(/your interview is scored/i)).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(signupDialog).toBeHidden()
    await continueButton.click()
    await expect(signupDialog).toBeVisible()
  })

  for (const failure of ["creation", "checkpoint"] as const) {
    test(`keeps the work editable and blocks signup after a failed guest ${failure}`, async ({
      page,
    }) => {
      const backend = await installGuestBackend(page, {
        failCreation: failure === "creation",
        failCheckpoint: failure === "checkpoint",
      })
      await prepareGuestSubmission(page)
      await page.getByRole("button", { name: "Submit solution", exact: true }).click()
      await expect(page.getByText("Couldn't save your interview", { exact: true })).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Continue with your interviewer", exact: true })
      ).toHaveCount(0)
      await expect(page.getByRole("dialog")).toBeHidden()
      await expect(page.locator(".cm-content").first()).toContainText("function twoSum")
      await expect(page.getByRole("button", { name: "Submit solution", exact: true })).toBeEnabled()
      expect(
        backend.acceptedCheckpoints.every((body) => !body.sessionState?.isPostInterviewDiscussion)
      ).toBe(true)
      expect(backend.writes.every((body) => body.performanceScore === undefined)).toBe(true)
    })
  }
})
