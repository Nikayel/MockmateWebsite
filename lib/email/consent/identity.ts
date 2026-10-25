import "server-only"
import { adminAuth } from "@/lib/firebase-admin"

/** Profile fields are client-editable; external delivery/suppression uses Auth identity. */
export async function accountEmail(userId: string): Promise<string | null> {
  try {
    const user = await adminAuth.getUser(userId)
    return user.email?.trim().toLowerCase() || null
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/user-not-found"
    )
      return null
    throw error
  }
}
