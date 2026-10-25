import { useEmailPreferences } from "@/components/account/useEmailPreferences"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import type { EmailPreferenceKey } from "@/lib/email/consent/policy"

const user = { getIdToken: async () => "fixture-token" }
const switches: Array<[EmailPreferenceKey, string]> = [
  ["email_notifications_enabled", "Optional emails"],
  ["inactivity_reminders", "Practice reminders"],
  ["spaced_repetition_reminders", "Review alerts"],
  ["marketing_emails", "Product updates"],
]
export function EmailConsentFixture() {
  const settings = useEmailPreferences(user)
  return (
    <section className="mx-auto max-w-md space-y-4 p-6">
      <h1>Email settings</h1>
      {settings.loading && <p role="status">Loading email settings…</p>}
      {settings.error && (
        <p role="alert">
          {settings.error}
          <Button onClick={settings.reload}>Retry</Button>
        </p>
      )}
      {switches.map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-4">
          {label}
          <Switch
            aria-label={label}
            checked={settings.preferences[key]}
            disabled={settings.loading || settings.saving || Boolean(settings.error)}
            onCheckedChange={(value) => settings.changePreference(key, value)}
          />
        </label>
      ))}
    </section>
  )
}
