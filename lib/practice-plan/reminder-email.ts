import { sendEmail, type EmailResult } from "@/lib/email/brevo"
import { emailWrapper, escapeHtml } from "@/lib/email/templates"
import { listUnsubscribeHeaders, unsubscribeUrlFor } from "@/lib/email/unsubscribe"
import { getAppBaseUrl } from "@/lib/site-url"
import type { PracticePlan } from "./schema"

export function practiceReminderContent(plan: PracticePlan) {
  const url = `${getAppBaseUrl()}${plan.recommendation.href}&return=reminder`
  const unsubscribe = unsubscribeUrlFor(plan.userId, "inactivity")
  const title = plan.recommendation.title
  return {
    subject: "Your saved practice is ready",
    htmlContent: emailWrapper(
      `<p>You asked for a reminder to practice <strong>${escapeHtml(title)}</strong>.</p><p>About ${plan.recommendation.estimatedMinutes} minutes. Focus: ${escapeHtml(plan.recommendation.focus)}</p><p><a href="${escapeHtml(url)}">Open your saved practice</a></p><p>Normal session limits apply when you start.</p><p>Nikayel</p>`,
      "reminder",
      { unsubscribeUrl: unsubscribe }
    ),
    textContent: `You asked for a reminder to practice ${title}.\n\nAbout ${plan.recommendation.estimatedMinutes} minutes. Focus: ${plan.recommendation.focus}\n\nOpen your saved practice: ${url}\n\nNormal session limits apply when you start.\n\nNikayel\n\n${unsubscribe ? `Unsubscribe: ${unsubscribe}\n` : ""}Email preferences: ${getAppBaseUrl()}/account`,
    headers: listUnsubscribeHeaders(plan.userId, "inactivity"),
  }
}

export async function sendPracticeReminder(
  plan: PracticePlan,
  email: string
): Promise<EmailResult> {
  const content = practiceReminderContent(plan)
  if (!content.headers)
    return { success: false, error: "Reminder unsubscribe is not configured", retryable: true }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      sendEmail({ ...content, to: [{ email }], tags: ["saved-practice"], singleAttempt: true }),
      new Promise<EmailResult>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              success: false,
              deliveryUncertain: true,
              error: "Reminder delivery timed out",
            }),
          15_000
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
