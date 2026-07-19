/**
 * Client-side Firestore helper for creating in-app notifications.
 *
 * The full notification system (preferences, history, analytics, the queue, and
 * the send-gating rules) is owned by notification-helpers-server.ts. This client
 * module intentionally exposes only the single helper the auth callback needs, so
 * the send-gating rules are not duplicated (and cannot drift) across two files.
 */

import { db } from "./firebase"
import { doc, setDoc, collection } from "firebase/firestore"
import type { InAppNotification } from "./types/notifications"

/**
 * Create an in-app notification.
 */
export async function createInAppNotification(
  notification: Omit<InAppNotification, "id" | "createdAt">
): Promise<InAppNotification> {
  const notifRef = doc(collection(db, "in_app_notifications"))

  const newNotification: InAppNotification = {
    ...notification,
    id: notifRef.id,
    createdAt: new Date().toISOString(),
  }

  await setDoc(notifRef, newNotification)
  return newNotification
}
