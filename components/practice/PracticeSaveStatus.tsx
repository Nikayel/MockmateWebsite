import { CheckCircle2 } from "lucide-react"
import type { PracticePlan } from "@/lib/practice-plan/schema"

export function PracticeSaveStatus({ plan, complete }: { plan: PracticePlan; complete: boolean }) {
  const pending = !complete && plan.reminderStatus === "pending" && plan.reminderAt
  const unconfirmed = plan.reminderStatus === "failed" || plan.reminderStatus === "uncertain"
  const title = complete
    ? "Practice completed"
    : pending
      ? "Reminder set"
      : plan.reminderStatus === "sent"
        ? "Reminder sent"
        : plan.reminderStatus === "sending"
          ? "Reminder sending"
          : "Saved to dashboard"

  return (
    <div
      role="status"
      aria-atomic="true"
      tabIndex={-1}
      className="focus-visible:ring-ring flex min-w-0 items-start gap-2 rounded-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <CheckCircle2 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {!complete && (
          <p className="text-muted-foreground text-xs leading-5 break-words">
            {pending ? (
              <>
                Email after{" "}
                <time dateTime={pending}>
                  {new Date(pending).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </time>
              </>
            ) : unconfirmed ? (
              "Reminder unconfirmed. Try a new time."
            ) : plan.reminderStatus === "cancelled" ? (
              "Reminder cancelled."
            ) : plan.reminderStatus === "none" ? (
              "No email reminder."
            ) : (
              "Your task is saved to your dashboard."
            )}
          </p>
        )}
      </div>
    </div>
  )
}
