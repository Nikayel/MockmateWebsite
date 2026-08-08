import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Bug, ExternalLink } from "lucide-react"

/**
 * Error Monitoring.
 *
 * This page used to read `/api/admin/analytics`, whose error figures come from
 * `analytics_events` rows with `event_name` "error". The only thing that would
 * ever have written one was `trackError`, which was deleted once Sentry became
 * the real error store. Nothing has written that event since, so every number
 * the page rendered was a structural zero and the empty list rendered a GREEN
 * "No errors recorded" panel.
 *
 * That is the worst possible reading of a dead pipeline: the admin System Health
 * page reports "Not collected here" about the very same collection, so the two
 * screens gave opposite verdicts about one truth, and the one that looked
 * authoritative was the one that was wrong. The page now states what is actually
 * known, which is where errors live and that it is not here.
 */
export default function ErrorsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-white">Error Monitoring</h1>
        <p className="mt-1 text-gray-400">Where application errors are recorded</p>
      </div>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-gray-500/20 p-3">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-500">Not collected here</p>
              <p className="mt-1 text-sm text-gray-400">
                Error volume lives in Sentry. No Firestore sink records it, so this page has no
                count to show you and an empty screen here is not evidence that nothing broke.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bug className="h-5 w-5 text-[#c4703f]" />
            Where errors actually go
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-400">
          <p>
            Server and API errors are reported through{" "}
            <code className="rounded bg-gray-800 px-1 text-gray-300">lib/logger</code>, and errors
            raised in the browser are posted to{" "}
            <code className="rounded bg-gray-800 px-1 text-gray-300">/api/client-error</code>. Both
            paths end at Sentry, which is where stack traces, source maps, release tracking and
            grouping live.
          </p>
          <p>
            Sentry reporting is active only when{" "}
            <code className="rounded bg-gray-800 px-1 text-gray-300">SENTRY_DSN</code> is set in the
            environment. With that variable unset, errors are logged to the platform console and
            nowhere else.
          </p>
          <p className="flex items-center gap-2 text-gray-500">
            <ExternalLink className="h-4 w-4 shrink-0" />
            Open the Sentry project to review recent issues.
          </p>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-white">Why this page shows no list</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400">
          <p>
            It previously listed{" "}
            <code className="rounded bg-gray-800 px-1 text-gray-300">analytics_events</code> rows
            with an event name of &quot;error&quot;. Nothing in the codebase writes that event, so
            the list was always empty and reported the emptiness as a clean bill of health. A count
            that can only ever be zero is not a metric, and restoring the list would mean writing
            errors to Firestore in parallel with Sentry rather than reading a sink that was never
            filled.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
