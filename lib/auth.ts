import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth"
import { auth } from "./firebase"

export async function signInWithGitHub(redirect?: string) {
  // Store redirect in localStorage to retrieve after auth
  if (redirect) {
    localStorage.setItem("auth_redirect", redirect)
  }

  const provider = new GithubAuthProvider()
  provider.addScope('read:user')
  
  try {
    const result = await signInWithPopup(auth, provider)
    return {
      user: result.user,
      providerId: result.providerId,
    }
  } catch (error) {
    console.error("Error signing in:", error)
    throw error
  }
}

export async function signInWithGoogle(redirect?: string) {
  // Store redirect in localStorage to retrieve after auth
  if (redirect) {
    localStorage.setItem("auth_redirect", redirect)
  }

  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')
  
  try {
    const result = await signInWithPopup(auth, provider)
    return {
      user: result.user,
      providerId: result.providerId,
    }
  } catch (error) {
    console.error("Error signing in:", error)
    throw error
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error("Error signing out:", error)
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
  return `vscode://nikayel.MockMate/auth-callback?token=${encodedToken}`
}

// Helper to convert Firebase user to our User type
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
