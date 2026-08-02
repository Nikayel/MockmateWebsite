import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError,
  Auth,
} from "firebase/auth"
import { trackLogin, trackSignup } from "./analytics"

// Development mode check - logs only appear in development
const isDev = process.env.NODE_ENV === "development"

// =============================================================================
// SECURITY: Redirect URL Validation
// =============================================================================
// Every post-sign-in destination in the app funnels through `resolveSafeRedirect`
// below. The `redirect` query parameter is fully attacker-controlled (anyone can
// hand a visitor a `/login?redirect=...` link), so it is never handed to
// `router.push` without being parsed and rebuilt here first.

/** Where an absent, malformed, or non-whitelisted redirect lands. */
export const DEFAULT_REDIRECT_PATH = "/dashboard"

// First path segment whitelist. A redirect is only honoured when its first
// segment is one of these, which is what keeps an open redirect impossible even
// if the character-level checks below were ever bypassed.
//
// Keep in sync with the `?redirect=` call sites across the app: `proxy.ts` sends
// the full pathname of any PROTECTED_ROUTES hit, and pages/components link to
// `/login?redirect=<segment>` directly. Dropping a segment here silently sends
// that flow to the dashboard instead of back where the user was.
const ALLOWED_REDIRECT_PATHS = [
  "dashboard",
  "interview",
  "interview-prep",
  "practice",
  "account",
  "profile",
  "sessions",
  "roadmap",
  "pricing",
  "admin",
  "learn",
  "knowledge",
  "labs",
  "metrics",
  "upgrade",
  "limit-reached",
] as const

// Characters permitted in a preserved query string / hash fragment. Deliberately
// narrower than the RFC 3986 grammar: no whitespace, no angle brackets, no
// quotes, nothing that could be smuggled into markup by a downstream consumer.
const SAFE_REDIRECT_SUFFIX_PATTERN = /^[A-Za-z0-9\-._~%!$&'()*+,;=:@/?#[\]]*$/

// C0 controls plus DEL. A raw tab or newline can hide a scheme from a naive
// substring check ("java\tscript:alert(1)" is still a scheme to some parsers).
function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

/**
 * Parses a candidate redirect into a same-origin path, or returns null when it
 * is unusable. This is the single authority; `isValidRedirectPath` and
 * `resolveSafeRedirect` are both thin wrappers so the two can never disagree.
 *
 * Accepts both shapes that exist in the codebase: the slash-prefixed pathname
 * emitted by `proxy.ts` ("/learn/python/foundations/py-l1-hello/workspace") and
 * the legacy slash-less segment form written by older call sites
 * ("sessions/abc"). Output is always exactly one leading slash, so callers must
 * never re-prefix the result.
 */
function parseSafeRedirect(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null

  const trimmed = raw.trim()
  if (!trimmed) return null
  if (containsControlCharacter(trimmed)) return null
  // Browsers treat a backslash as a path separator, so "/\evil.example" is
  // resolved exactly like the protocol-relative "//evil.example".
  if (trimmed.includes("\\")) return null

  // Split the query/hash off first: those may legitimately contain characters
  // ("?", ":", "//") that are forbidden inside the path itself.
  const suffixStart = trimmed.search(/[?#]/)
  const rawPath = suffixStart === -1 ? trimmed : trimmed.slice(0, suffixStart)
  const suffix = suffixStart === -1 ? "" : trimmed.slice(suffixStart)

  if (suffix && !SAFE_REDIRECT_SUFFIX_PATTERN.test(suffix)) return null

  if (!isSameOriginPathCandidate(rawPath)) return null

  // Percent-encoding must not be able to hide any of the checks above
  // ("%2F%2Fevil.example", "%5Cevil.example", "java%09script:").
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(rawPath)
  } catch {
    return null // malformed escape sequence
  }
  if (containsControlCharacter(decodedPath)) return null
  if (decodedPath.includes("\\")) return null
  if (!isSameOriginPathCandidate(decodedPath)) return null

  // "//" was already rejected, so there is at most one leading and one trailing
  // slash to strip, and no empty interior segments to worry about.
  const normalized = rawPath.replace(/^\//, "").replace(/\/$/, "")
  if (!normalized) return null // bare "/" has no destination of its own

  const firstSegment = normalized.split("/")[0].toLowerCase()
  if (!(ALLOWED_REDIRECT_PATHS as readonly string[]).includes(firstSegment)) return null

  return `/${normalized}${suffix}`
}

/**
 * Rejects anything that could leave the current origin or escape the path:
 * "//host" is protocol-relative, "scheme:" is absolute, and ".." is traversal.
 */
function isSameOriginPathCandidate(path: string): boolean {
  return !path.includes("//") && !path.includes(":") && !path.includes("..")
}

/**
 * Validates a redirect path against the whitelist
 * Prevents open redirect vulnerabilities by only allowing known paths
 */
export function isValidRedirectPath(path: string | null | undefined): boolean {
  return parseSafeRedirect(path) !== null
}

/**
 * Resolves any candidate redirect into a path that is always safe to hand
 * straight to `router.push`. Never returns an off-origin URL and never returns
 * a value that needs a slash prepended; invalid input falls back to the
 * dashboard rather than failing the sign-in.
 */
export function resolveSafeRedirect(raw: string | null | undefined): string {
  return parseSafeRedirect(raw) ?? DEFAULT_REDIRECT_PATH
}

/**
 * Safely stores a redirect path in localStorage after validation.
 * Stores the normalized leading-slash form so `getStoredRedirectPath` round-trips
 * a value that is ready to push as-is.
 */
export function storeRedirectPath(redirect: string | null | undefined): void {
  if (typeof window === "undefined") return

  const safeRedirect = parseSafeRedirect(redirect)
  if (safeRedirect) {
    localStorage.setItem("auth_redirect", safeRedirect)
  }
  // Invalid redirects are silently ignored for security
}

/**
 * Retrieves and validates a stored redirect path
 * Returns null if invalid or not present.
 *
 * Re-validates on read because a few call sites still write `auth_redirect`
 * directly (and because localStorage is user-editable), and re-normalizes so the
 * legacy slash-less form comes back with its leading slash attached.
 */
export function getStoredRedirectPath(): string | null {
  if (typeof window === "undefined") return null

  const savedRedirect = localStorage.getItem("auth_redirect")
  localStorage.removeItem("auth_redirect") // Always clear after reading

  return parseSafeRedirect(savedRedirect)
}

// Helper function to get user-friendly error messages
function getAuthErrorMessage(error: any): string {
  const code = error?.code || ""
  const message = error?.message || "An unknown error occurred"

  // Handle common Firebase auth errors
  switch (code) {
    case "auth/internal-error":
      return "Firebase authentication service error. Please check your Firebase configuration and ensure OAuth providers are enabled in Firebase Console."
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please enable GitHub/Google sign-in in Firebase Console."
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed. Please try again."
    case "auth/popup-blocked":
      return "Pop-up was blocked by your browser. Please allow pop-ups for this site and try again."
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again."
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase authentication. Please add it in Firebase Console."
    case "auth/configuration-not-found":
      return "Firebase configuration not found. Please check your environment variables."
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Please check your environment variables."
    case "auth/domain-config-required":
      return "Auth domain configuration required. Please configure your auth domain in Firebase Console."
    default:
      // Return the original message if it's helpful, otherwise provide a generic message
      if (message.includes("internal-error") || message.includes("internal error")) {
        return "Firebase authentication service error. Please verify your Firebase project configuration and OAuth provider settings."
      }
      return message
  }
}

// Validate Firebase auth is initialized
function validateAuth(auth: Auth) {
  if (!auth) {
    if (isDev) console.error("Firebase Auth is not initialized")
    throw new Error("Firebase Auth is not initialized. Please check your Firebase configuration.")
  }

  // Check if auth domain is configured
  if (!auth.app.options.authDomain) {
    if (isDev) {
      console.error("Firebase Auth domain is not configured")
      console.error("Current Firebase config:", {
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain,
        apiKey: auth.app.options.apiKey ? "***" : "missing",
      })
    }
    throw new Error(
      "Firebase Auth domain is not configured. Please check your environment variables."
    )
  }

  // Log auth configuration for debugging (dev only)
  const config = {
    projectId: auth.app.options.projectId,
    authDomain: auth.app.options.authDomain,
    hasApiKey: !!auth.app.options.apiKey,
    apiKeyPrefix: auth.app.options.apiKey
      ? auth.app.options.apiKey.substring(0, 10) + "..."
      : "missing",
    storageBucket: auth.app.options.storageBucket,
    appId: auth.app.options.appId ? auth.app.options.appId.substring(0, 10) + "..." : "missing",
  }
  if (isDev) console.log("Firebase Auth validated:", config)

  // Additional validation checks
  if (isDev && typeof window !== "undefined") {
    const currentHost = window.location.hostname
    const authDomain = auth.app.options.authDomain || ""

    // Warn if authDomain format looks wrong
    if (authDomain && !authDomain.includes(".") && currentHost !== "localhost") {
      console.warn("Auth domain format might be incorrect:", authDomain)
    }

    // Check if we're on localhost but authDomain doesn't include it
    if (
      currentHost === "localhost" &&
      authDomain &&
      !authDomain.includes("localhost") &&
      !authDomain.includes("127.0.0.1")
    ) {
      console.warn("Running on localhost but authDomain doesn't include localhost:", authDomain)
      console.warn("Make sure 'localhost' is added to authorized domains in Firebase Console")
    }
  }

  return config
}

export async function signInWithGitHub(redirect?: string) {
  const { getAuthLazy } = await import("./firebase-lazy")
  const auth = await getAuthLazy()

  // Validate auth is initialized
  validateAuth(auth)

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GithubAuthProvider()
  provider.addScope("read:user")

  try {
    if (isDev) {
      console.log("Attempting GitHub sign-in...")
      console.log("Auth domain:", auth.app.options.authDomain)
      console.log("Current origin:", typeof window !== "undefined" ? window.location.origin : "N/A")
    }

    // Check if popup might be blocked
    if (typeof window !== "undefined") {
      const testPopup = window.open("", "_blank", "width=1,height=1")
      if (!testPopup || testPopup.closed || typeof testPopup.closed === "undefined") {
        if (isDev) console.warn("Popup might be blocked, consider using redirect method")
      } else {
        testPopup.close()
      }
    }

    const result = await signInWithPopup(auth, provider)
    if (isDev) console.log("GitHub sign-in successful")

    // Track login/signup event
    const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
    if (isNewUser) {
      trackSignup("github", result.user.uid)
    } else {
      trackLogin("github", result.user.uid)
    }

    return {
      user: result.user,
      providerId: result.providerId,
    }
  } catch (error: any) {
    if (isDev) {
      console.error("Error signing in with GitHub:", error)
      console.error("Error code:", error?.code)
      console.error("Error message:", error?.message)
      console.error("Error name:", error?.name)
      console.error("Error stack:", error?.stack)

      // Try to extract more details from the error
      if (error?.customData) {
        console.error("Error customData:", error.customData)
      }
      if (error?.cause) {
        console.error("Error cause:", error.cause)
      }

      // Log Firebase configuration for debugging
      if (error?.code === "auth/internal-error") {
        console.error("Debugging auth/internal-error:")
        console.error("- Auth domain:", auth.app.options.authDomain)
        console.error("- Project ID:", auth.app.options.projectId)
        console.error("- Has API key:", !!auth.app.options.apiKey)
        console.error(
          "- Current URL:",
          typeof window !== "undefined" ? window.location.href : "N/A"
        )
        console.error(
          "- Current origin:",
          typeof window !== "undefined" ? window.location.origin : "N/A"
        )
        console.error("- User agent:", typeof window !== "undefined" ? navigator.userAgent : "N/A")

        // Check if authDomain matches current origin
        const currentHost = typeof window !== "undefined" ? window.location.hostname : ""
        const authDomain = auth.app.options.authDomain || ""
        if (authDomain && !authDomain.includes(currentHost) && currentHost !== "localhost") {
          console.error("WARNING: Auth domain doesn't match current hostname!")
          console.error("  Auth domain:", authDomain)
          console.error("  Current hostname:", currentHost)
        }

        console.error("Please verify:")
        console.error("  1. GitHub OAuth provider is enabled in Firebase Console")
        console.error(
          "  2. Authorized domains include:",
          auth.app.options.authDomain,
          "and",
          currentHost
        )
        console.error("  3. OAuth redirect URIs are configured correctly")
        console.error("  4. Check browser console for CSP violations")
        console.error("  5. Try disabling browser extensions that might block popups")

        // Suggest using redirect as fallback
        console.error("Alternative: Try using redirect-based auth instead of popup")
      }
    }

    // Provide user-friendly error message
    const friendlyMessage = getAuthErrorMessage(error)
    const authError = new Error(friendlyMessage) as any
    authError.code = error?.code
    authError.originalError = error
    throw authError
  }
}

export async function signInWithGoogle(redirect?: string) {
  const { getAuthLazy } = await import("./firebase-lazy")
  const auth = await getAuthLazy()

  // Validate auth is initialized
  validateAuth(auth)

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GoogleAuthProvider()
  provider.addScope("profile")
  provider.addScope("email")

  try {
    if (isDev) {
      console.log("Attempting Google sign-in...")
      console.log("Auth domain:", auth.app.options.authDomain)
      console.log("Current origin:", typeof window !== "undefined" ? window.location.origin : "N/A")
    }

    // Check if popup might be blocked
    if (typeof window !== "undefined") {
      const testPopup = window.open("", "_blank", "width=1,height=1")
      if (!testPopup || testPopup.closed || typeof testPopup.closed === "undefined") {
        if (isDev) console.warn("Popup might be blocked, consider using redirect method")
      } else {
        testPopup.close()
      }
    }

    const result = await signInWithPopup(auth, provider)
    if (isDev) console.log("Google sign-in successful")

    // Track login/signup event
    const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
    if (isNewUser) {
      trackSignup("google", result.user.uid)
    } else {
      trackLogin("google", result.user.uid)
    }

    return {
      user: result.user,
      providerId: result.providerId,
    }
  } catch (error: any) {
    if (isDev) {
      console.error("Error signing in with Google:", error)
      console.error("Error code:", error?.code)
      console.error("Error message:", error?.message)
      console.error("Error name:", error?.name)
      console.error("Error stack:", error?.stack)

      // Try to extract more details from the error
      if (error?.customData) {
        console.error("Error customData:", error.customData)
      }
      if (error?.cause) {
        console.error("Error cause:", error.cause)
      }

      // Log Firebase configuration for debugging
      if (error?.code === "auth/internal-error") {
        console.error("Debugging auth/internal-error:")
        console.error("- Auth domain:", auth.app.options.authDomain)
        console.error("- Project ID:", auth.app.options.projectId)
        console.error("- Has API key:", !!auth.app.options.apiKey)
        console.error(
          "- Current URL:",
          typeof window !== "undefined" ? window.location.href : "N/A"
        )
        console.error(
          "- Current origin:",
          typeof window !== "undefined" ? window.location.origin : "N/A"
        )
        console.error("- User agent:", typeof window !== "undefined" ? navigator.userAgent : "N/A")

        // Check if authDomain matches current origin
        const currentHost = typeof window !== "undefined" ? window.location.hostname : ""
        const authDomain = auth.app.options.authDomain || ""
        if (authDomain && !authDomain.includes(currentHost) && currentHost !== "localhost") {
          console.error("WARNING: Auth domain doesn't match current hostname!")
          console.error("  Auth domain:", authDomain)
          console.error("  Current hostname:", currentHost)
        }

        console.error("Please verify:")
        console.error("  1. Google OAuth provider is enabled in Firebase Console")
        console.error(
          "  2. Authorized domains include:",
          auth.app.options.authDomain,
          "and",
          currentHost
        )
        console.error("  3. OAuth redirect URIs are configured correctly")
        console.error("  4. Check browser console for CSP violations")
        console.error("  5. Try disabling browser extensions that might block popups")

        // Suggest using redirect as fallback
        console.error("Alternative: Try using redirect-based auth instead of popup")
      }
    }

    // Provide user-friendly error message
    const friendlyMessage = getAuthErrorMessage(error)
    const authError = new Error(friendlyMessage) as any
    authError.code = error?.code
    authError.originalError = error
    throw authError
  }
}

export async function signOut() {
  try {
    const { getAuthLazy } = await import("./firebase-lazy")
    const auth = await getAuthLazy()
    await firebaseSignOut(auth)
  } catch (error) {
    if (isDev) console.error("Error signing out:", error)
    throw error
  }
}

export async function getCurrentUser(): Promise<FirebaseUser | null> {
  const { getAuthLazy } = await import("./firebase-lazy")
  const auth = await getAuthLazy()
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export function generateVSCodeDeepLink(token: string) {
  const encodedToken = encodeURIComponent(token)
  // VS Code extension coming soon - will use codesparring extension ID
  return `vscode://nikayel.codesparring/auth-callback?token=${encodedToken}`
}

// Helper to convert Firebase user to our User type
// Redirect-based sign-in functions (fallback for when popup fails)
export async function signInWithGitHubRedirect(redirect?: string) {
  const { getAuthLazy } = await import("./firebase-lazy")
  const auth = await getAuthLazy()
  validateAuth(auth)

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GithubAuthProvider()
  provider.addScope("read:user")

  await signInWithRedirect(auth, provider)
  // Note: This will redirect the page, so we won't return here
}

export async function signInWithGoogleRedirect(redirect?: string) {
  const { getAuthLazy } = await import("./firebase-lazy")
  const auth = await getAuthLazy()
  validateAuth(auth)

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GoogleAuthProvider()
  provider.addScope("profile")
  provider.addScope("email")

  await signInWithRedirect(auth, provider)
  // Note: This will redirect the page, so we won't return here
}

// Handle redirect result (call this on the auth callback page)
export async function handleAuthRedirect() {
  try {
    const { getAuthLazy } = await import("./firebase-lazy")
    const auth = await getAuthLazy()
    const result = await getRedirectResult(auth)
    if (result) {
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
      if (isNewUser) {
        trackSignup(result.providerId === "github.com" ? "github" : "google", result.user.uid)
      } else {
        trackLogin(result.providerId === "github.com" ? "github" : "google", result.user.uid)
      }
      return {
        user: result.user,
        providerId: result.providerId,
      }
    }
    return null
  } catch (error: any) {
    if (isDev) console.error("Error handling auth redirect:", error)
    throw error
  }
}

export function convertFirebaseUser(firebaseUser: FirebaseUser | null) {
  if (!firebaseUser) return null

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    user_metadata: {
      full_name: firebaseUser.displayName || undefined,
      avatar_url: firebaseUser.photoURL || undefined,
    },
  }
}
