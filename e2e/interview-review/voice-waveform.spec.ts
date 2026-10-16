import { expect, test } from "@playwright/test"
import { installVoiceAudio, openVoiceWorkspace } from "./voice-audio"

test("waveform follows sound and silence, and releases the shared microphone on cancel and send", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await installVoiceAudio(page)
  await openVoiceWorkspace(page)
  const waveform = page.locator("[data-recording-waveform]")
  const bars = waveform.locator("rect")
  const peakHeight = () =>
    bars.evaluateAll((bars) => Math.max(...bars.map((bar) => Number(bar.getAttribute("height")))))
  await expect(waveform).toBeVisible()
  await expect.poll(peakHeight).toBe(3)
  await page.evaluate(() => window.voiceAudioFixture.setAmplitude(0.2))
  await expect.poll(peakHeight).toBeGreaterThan(10)
  await page.evaluate(() => window.voiceAudioFixture.setAmplitude(0))
  await expect.poll(peakHeight).toBe(3)
  expect(await page.evaluate(() => window.voiceAudioFixture.requests)).toBe(1)
  await expect(page.getByText("Live transcription", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Cancel voice answer" }).click()
  await expect(waveform).toHaveCount(0)
  expect(
    await page.evaluate(() => window.voiceAudioFixture.streams.every((stream) => !stream.active))
  ).toBe(true)
  await expect(page.getByRole("textbox", { name: "Chat with interviewer" })).toHaveValue("")

  await page.getByRole("button", { name: "Start voice answer" }).click()
  await expect(waveform).toBeVisible()
  await page.getByRole("button", { name: "Send voice answer" }).click()
  await expect(waveform).toHaveCount(0)
  await expect(page.getByText(/Sending/)).toHaveCount(0)
  await expect(page.getByRole("log", { name: "Interview messages" })).toContainText(
    "I reproduced the failing case."
  )
  expect(await page.evaluate(() => window.voiceAudioFixture.requests)).toBe(2)
  expect(
    await page.evaluate(() => window.voiceAudioFixture.streams.every((stream) => !stream.active))
  ).toBe(true)
  expect(errors).toEqual([])
})

test("stopping recording removes the waveform and preserves the transcript draft", async ({
  page,
}) => {
  await installVoiceAudio(page)
  await openVoiceWorkspace(page)
  await expect(page.getByText("Live transcription", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Stop recording" }).click()
  await expect(page.locator("[data-recording-waveform]")).toHaveCount(0)
  await expect(page.getByRole("textbox", { name: "Chat with interviewer" })).toHaveValue(
    "I reproduced the failing case."
  )
  expect(
    await page.evaluate(() => window.voiceAudioFixture.streams.every((stream) => !stream.active))
  ).toBe(true)
})

test("reduced motion keeps recording and transcription available without animated bars", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await installVoiceAudio(page)
  await openVoiceWorkspace(page)
  await expect(page.getByText("Live transcription", { exact: true })).toBeVisible()
  await expect(page.locator("[data-recording-waveform]")).toHaveCount(0)
  expect(await page.evaluate(() => window.voiceAudioFixture.analyserContexts)).toBe(0)
  await page.getByRole("button", { name: "Cancel voice answer" }).click()
  await expect(page.getByRole("button", { name: "Start voice answer" })).toBeEnabled()
})

test("unsupported audio visualization preserves the normal recording controls", async ({
  page,
}) => {
  await installVoiceAudio(page, { visualizationUnavailable: true })
  await openVoiceWorkspace(page)
  await expect(page.getByText("Live transcription", { exact: true })).toBeVisible()
  await expect(page.locator("[data-recording-waveform]")).toHaveCount(0)
  await page.getByRole("button", { name: "Send voice answer" }).click()
  await expect(page.getByRole("log", { name: "Interview messages" })).toContainText(
    "I reproduced the failing case."
  )
})

test("a disconnected microphone removes the waveform and stops the recording stream", async ({
  page,
}) => {
  await installVoiceAudio(page)
  await openVoiceWorkspace(page)
  await expect(page.locator("[data-recording-waveform]")).toBeVisible()
  await page.evaluate(() =>
    window.voiceAudioFixture.streams[0].getAudioTracks()[0].dispatchEvent(new Event("ended"))
  )
  await expect(page.locator("[data-recording-waveform]")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Stop recording" })).toHaveCount(0)
  expect(
    await page.evaluate(() => window.voiceAudioFixture.streams.every((stream) => !stream.active))
  ).toBe(true)
})

test("denied microphone access leaves typing available without a waveform", async ({ page }) => {
  await installVoiceAudio(page, { micDenied: true })
  await page.goto("/?view=workspace&voice=1&theme=light")
  await page.getByRole("button", { name: "Start voice answer" }).click()
  await expect(page.getByRole("textbox", { name: "Chat with interviewer" })).toBeEnabled()
  await expect(page.getByText(/Allow microphone access/i)).toBeVisible()
  await expect(page.locator("[data-recording-waveform]")).toHaveCount(0)
  expect(await page.evaluate(() => window.voiceAudioFixture.analyserContexts)).toBe(0)
})

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 375]) {
    test(`recording controls fit in ${theme} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await installVoiceAudio(page)
      await openVoiceWorkspace(page, theme)
      await page.evaluate(() => window.voiceAudioFixture.setAmplitude(0.2))
      const waveform = page.locator("[data-recording-waveform]")
      await expect(waveform).toBeInViewport()
      await expect
        .poll(() =>
          waveform
            .locator("rect")
            .evaluateAll(
              (bars) => bars.filter((bar) => Number(bar.getAttribute("height")) > 10).length
            )
        )
        .toBeGreaterThan(8)
      for (const name of ["Stop recording", "Cancel voice answer", "Send voice answer"])
        await expect(page.getByRole("button", { name, exact: true })).toBeInViewport()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`recording-${theme}-${width}.png`) })
    })
  }
}
