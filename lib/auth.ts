import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError
} from "firebase/auth"
import { auth } from "./firebase"
import { trackLogin, trackSignup } from "./analytics"

// Development mode check - logs only appear in development
const isDev = process.env.NODE_ENV === 'development'

// =============================================================================
// SECURITY: Redirect URL Validation
// =============================================================================
// Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PATHS = [
  'dashboard',
  'interview',
  'practice',
  'account',
  'profile',
  'sessions',
  'roadmap',
  'pricing',
  'admin',
] as const

/**
 * Validates a redirect path against the whitelist
 * Prevents open redirect vulnerabilities by only allowing known paths
 */
export function isValidRedirectPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') return false

  // Remove leading/trailing slashes and normalize
  const normalizedPath = path.replace(/^\/+|\/+$/g, '').toLowerCase()

  // Check if path starts with any allowed path
  return ALLOWED_REDIRECT_PATHS.some(allowed =>
    normalizedPath === allowed || normalizedPath.startsWith(`${allowed}/`)
  )
}

/**
 * Safely stores a redirect path in localStorage after validation
 */
export function storeRedirectPath(redirect: string | undefined): void {
  if (redirect && isValidRedirectPath(redirect)) {
    localStorage.setItem("auth_redirect", redirect)
  }
  // Invalid redirects are silently ignored for security
}

/**
 * Retrieves and validates a stored redirect path
 * Returns null if invalid or not present
 */
export function getStoredRedirectPath(): string | null {
  if (typeof window === 'undefined') return null

  const savedRedirect = localStorage.getItem("auth_redirect")
  localStorage.removeItem("auth_redirect") // Always clear after reading

  if (savedRedirect && isValidRedirectPath(savedRedirect)) {
    return savedRedirect
  }

  return null
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
function validateAuth() {
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
        apiKey: auth.app.options.apiKey ? "***" : "missing"
      })
    }
    throw new Error("Firebase Auth domain is not configured. Please check your environment variables.")
  }

  // Log auth configuration for debugging (dev only)
  const config = {
    projectId: auth.app.options.projectId,
    authDomain: auth.app.options.authDomain,
    hasApiKey: !!auth.app.options.apiKey,
    apiKeyPrefix: auth.app.options.apiKey ? auth.app.options.apiKey.substring(0, 10) + "..." : "missing",
    storageBucket: auth.app.options.storageBucket,
    appId: auth.app.options.appId ? auth.app.options.appId.substring(0, 10) + "..." : "missing"
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
    if (currentHost === "localhost" && authDomain && !authDomain.includes("localhost") && !authDomain.includes("127.0.0.1")) {
      console.warn("Running on localhost but authDomain doesn't include localhost:", authDomain)
      console.warn("Make sure 'localhost' is added to authorized domains in Firebase Console")
    }
  }

  return config
}

export async function signInWithGitHub(redirect?: string) {
  // Validate auth is initialized
  validateAuth()

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GithubAuthProvider()
  provider.addScope('read:user')

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
        console.error("- Current URL:", typeof window !== "undefined" ? window.location.href : "N/A")
        console.error("- Current origin:", typeof window !== "undefined" ? window.location.origin : "N/A")
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
        console.error("  2. Authorized domains include:", auth.app.options.authDomain, "and", currentHost)
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
  // Validate auth is initialized
  validateAuth()

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')

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
        console.error("- Current URL:", typeof window !== "undefined" ? window.location.href : "N/A")
        console.error("- Current origin:", typeof window !== "undefined" ? window.location.origin : "N/A")
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
        console.error("  2. Authorized domains include:", auth.app.options.authDomain, "and", currentHost)
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
    await firebaseSignOut(auth)
  } catch (error) {
    if (isDev) console.error("Error signing out:", error)
    throw error
  }
}

export async function getCurrentUser(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export function generateVSCodeDeepLink(token: string) {
  const encodedToken = encodeURIComponent(token)
  // VS Code extension coming soon - will use skillon extension ID
  return `vscode://nikayel.skillon/auth-callback?token=${encodedToken}`
}

// Helper to convert Firebase user to our User type
// Redirect-based sign-in functions (fallback for when popup fails)
export async function signInWithGitHubRedirect(redirect?: string) {
  validateAuth()

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GithubAuthProvider()
  provider.addScope('read:user')

  await signInWithRedirect(auth, provider)
  // Note: This will redirect the page, so we won't return here
}

export async function signInWithGoogleRedirect(redirect?: string) {
  validateAuth()

  // Store redirect in localStorage to retrieve after auth (with validation)
  storeRedirectPath(redirect)

  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')

  await signInWithRedirect(auth, provider)
  // Note: This will redirect the page, so we won't return here
}

// Handle redirect result (call this on the auth callback page)
export async function handleAuthRedirect() {
  try {
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
