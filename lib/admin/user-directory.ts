import { FieldPath } from "firebase-admin/firestore"
import type { UserRecord } from "firebase-admin/auth"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { adminCache, CACHE_TTL } from "@/lib/admin/cache"
import type { AdminUserListItem } from "@/lib/admin/user-list-query"

const DIRECTORY_CACHE_KEY = "admin:users:directory"
const MAX_AUTH_USERS = 5000
const AUTH_BATCH_SIZE = 1000
const PROFILE_BATCH_SIZE = 30
const PROFILE_QUERY_CONCURRENCY = 10

function getAuthProvider(authUser: UserRecord): string {
  const provider = authUser.providerData?.[0]?.providerId
  if (provider === "google.com") return "google"
  if (provider === "github.com") return "github"
  if (provider === "password") return "password"
  return provider || "unknown"
}

export interface UserDirectoryResult {
  users: AdminUserListItem[]
  capped: boolean
}

export async function loadUserDirectory(
  protectedEmails: readonly string[],
  forceRefresh = false
): Promise<UserDirectoryResult> {
  if (!forceRefresh) {
    const cached = adminCache.get<UserDirectoryResult>(DIRECTORY_CACHE_KEY)
    if (cached) return cached
  }

  const authUsers: UserRecord[] = []
  let pageToken: string | undefined

  do {
    const result = await adminAuth.listUsers(AUTH_BATCH_SIZE, pageToken)
    authUsers.push(...result.users)
    pageToken = result.pageToken
  } while (pageToken && authUsers.length < MAX_AUTH_USERS)

  const profileMap = new Map<string, FirebaseFirestore.DocumentData>()
  const profileIdBatches: string[][] = []
  for (let index = 0; index < authUsers.length; index += PROFILE_BATCH_SIZE) {
    profileIdBatches.push(
      authUsers.slice(index, index + PROFILE_BATCH_SIZE).map((user) => user.uid)
    )
  }

  for (let index = 0; index < profileIdBatches.length; index += PROFILE_QUERY_CONCURRENCY) {
    const queryWindow = profileIdBatches.slice(index, index + PROFILE_QUERY_CONCURRENCY)
    const snapshots = await Promise.all(
      queryWindow.map((ids) =>
        adminDb.collection("profiles").where(FieldPath.documentId(), "in", ids).get()
      )
    )
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((document) => profileMap.set(document.id, document.data()))
    })
  }

  const users = authUsers.map((authUser): AdminUserListItem => {
    const profile = profileMap.get(authUser.uid)
    const email = authUser.email || profile?.email || ""
    return {
      id: authUser.uid,
      email,
      is_protected: !!email && protectedEmails.includes(email.toLowerCase()),
      full_name: authUser.displayName || profile?.full_name || "",
      auth_provider: getAuthProvider(authUser),
      subscription_tier: profile?.subscription_tier || "free",
      subscription_status: profile?.subscription_status || "none",
      created_at: authUser.metadata?.creationTime || profile?.created_at || "",
      updated_at: profile?.updated_at || "",
      onboarding_completed: profile?.onboarding_completed || false,
      stripe_customer_id: profile?.stripe_customer_id || null,
    }
  })

  const result = { users, capped: authUsers.length >= MAX_AUTH_USERS }
  adminCache.set(DIRECTORY_CACHE_KEY, result, CACHE_TTL.USERS)
  return result
}

export function invalidateUserDirectory(): void {
  adminCache.delete(DIRECTORY_CACHE_KEY)
}
