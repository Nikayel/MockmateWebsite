import { adminDb } from "@/lib/firebase-admin"

const PROFILE_COLLECTION = "profiles"
const RESERVATION_TTL_MS = 10 * 60 * 1000

type ReservationOutcome =
  | { status: "reserved" }
  | { status: "claimed"; roadmapId: string }
  | { status: "in_progress" }

function reservationTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis
    if (typeof toMillis === "function") return toMillis.call(value)
  }
  return null
}

/**
 * Reserve the one free roadmap before doing any expensive generation.
 *
 * A reservation expires after ten minutes: a crashed function must not make a
 * learner permanently ineligible, while concurrent requests still cannot both
 * claim the offer.
 */
export async function reserveFirstFreeRoadmap(
  userId: string,
  roadmapId: string
): Promise<ReservationOutcome> {
  const profileRef = adminDb.collection(PROFILE_COLLECTION).doc(userId)

  return adminDb.runTransaction(async (transaction) => {
    const profile = transaction.get ? await transaction.get(profileRef) : await profileRef.get()
    const data = profile.data() || {}
    const claimedRoadmapId = data.first_free_roadmap_id

    if (typeof claimedRoadmapId === "string" && claimedRoadmapId) {
      return { status: "claimed", roadmapId: claimedRoadmapId }
    }

    const pendingRoadmapId = data.first_free_roadmap_reservation_id
    const pendingAt = reservationTime(data.first_free_roadmap_reserved_at)
    const pendingIsFresh =
      typeof pendingRoadmapId === "string" &&
      pendingAt !== null &&
      Date.now() - pendingAt < RESERVATION_TTL_MS

    if (pendingIsFresh) return { status: "in_progress" }

    transaction.set(
      profileRef,
      {
        first_free_roadmap_reservation_id: roadmapId,
        first_free_roadmap_reserved_at: new Date(),
      },
      { merge: true }
    )
    return { status: "reserved" }
  })
}

/** Confirm a reservation only after the roadmap document has been persisted. */
export async function confirmFirstFreeRoadmap(userId: string, roadmapId: string): Promise<void> {
  const profileRef = adminDb.collection(PROFILE_COLLECTION).doc(userId)

  await adminDb.runTransaction(async (transaction) => {
    const profile = transaction.get ? await transaction.get(profileRef) : await profileRef.get()
    const data = profile.data() || {}
    if (data.first_free_roadmap_reservation_id !== roadmapId) return

    transaction.set(
      profileRef,
      {
        first_free_roadmap_id: roadmapId,
        first_free_roadmap_claimed_at: new Date(),
        first_free_roadmap_reservation_id: null,
        first_free_roadmap_reserved_at: null,
      },
      { merge: true }
    )
  })
}

/** Release only our own reservation when generation fails. */
export async function releaseFirstFreeRoadmapReservation(
  userId: string,
  roadmapId: string
): Promise<void> {
  const profileRef = adminDb.collection(PROFILE_COLLECTION).doc(userId)

  await adminDb.runTransaction(async (transaction) => {
    const profile = transaction.get ? await transaction.get(profileRef) : await profileRef.get()
    if (profile.data()?.first_free_roadmap_reservation_id !== roadmapId) return

    transaction.set(
      profileRef,
      {
        first_free_roadmap_reservation_id: null,
        first_free_roadmap_reserved_at: null,
      },
      { merge: true }
    )
  })
}
