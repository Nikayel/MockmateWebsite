// Sealed reference solution (SERVER-ONLY) for an add-functionality scenario.
// The complete fixed files are moved out of the client module so they never ship
// in the browser bundle. No runtime code reads them; the node-side test gates
// apply them over the starter workspace to prove the suite goes green.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const digestSchedulerReference = `def schedule_digest_jobs(users, notifications, now_hour):
    jobs = []
    seen = set()
    notifications_by_user = {}
    for notification in notifications:
        notifications_by_user.setdefault(notification["user_id"], []).append(notification)

    for user in users:
        if not user.get("digest_enabled", False):
            continue
        quiet_start, quiet_end = user.get("quiet_hours", (22, 7))
        if quiet_start < quiet_end:
            in_quiet_hours = quiet_start <= now_hour < quiet_end
        else:
            in_quiet_hours = now_hour >= quiet_start or now_hour < quiet_end
        if in_quiet_hours:
            continue

        items = notifications_by_user.get(user["id"], [])
        unread = [item for item in items if not item.get("read")]
        if not unread:
            continue

        job_id = f"digest:{user['id']}:{now_hour}"
        if job_id in seen:
            continue
        seen.add(job_id)
        jobs.append({"job_id": job_id, "user_id": user["id"], "notification_ids": sorted({item["id"] for item in unread})})

    return jobs
`

const digestServiceReference = `from src.digest_scheduler import schedule_digest_jobs

def build_digest_response(users, notifications, now_hour):
    jobs = schedule_digest_jobs(users, notifications, now_hour)
    return {"count": len(jobs), "jobs": jobs}
`

export const sealed: SealedLegacyScenario = {
  id: "add-feature-digest-scheduler",
  referenceFiles: [
    {
      path: "src/digest_scheduler.py",
      role: "editable",
      language: "python",
      content: digestSchedulerReference,
    },
    {
      path: "src/digest_service.py",
      role: "editable",
      language: "python",
      content: digestServiceReference,
    },
  ],
}
