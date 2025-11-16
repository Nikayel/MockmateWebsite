"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import { User as UserType } from "./types"
import { convertFirebaseUser } from "./auth"

interface AuthContextType {
  user: UserType | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  initialized: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true
    let authStateResolved = false

    // Single auth state listener for the entire app
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!mounted) return

      authStateResolved = true

      setFirebaseUser(firebaseUser)

      if (firebaseUser) {
        const convertedUser = convertFirebaseUser(firebaseUser)
        setUser(convertedUser)
      } else {
        setUser(null)
      }

      setLoading(false)
      setInitialized(true)
    }, (error) => {
      if (!mounted) return
      console.error("Auth state change error:", error)
      authStateResolved = true
      setLoading(false)
      setInitialized(true)
    })

    // Safety timeout to prevent infinite loading
    // Firebase should respond quickly, but if it doesn't, we mark as initialized anyway
    // Increased to 5 seconds to give Firebase more time to restore sessions on page refresh
    // Only mark as initialized if auth state hasn't resolved yet
    const timeout = setTimeout(() => {
      if (mounted && !authStateResolved) {
        console.warn("Auth initialization timeout - marking as initialized")
        setLoading(false)
        // setInitialized(true)
      }
    }, 5) // 5 second timeout to prevent race condition on refresh

    return () => {
      mounted = false
      clearTimeout(timeout)
      unsubscribe()
    }
  }, []) // Empty dependency array - only run once on mount

  // Token refresh - refresh ID token every 50 minutes (tokens expire after 1 hour)
  useEffect(() => {
    if (!firebaseUser) return

    const refreshToken = async () => {
      try {
        // Force token refresh
        await firebaseUser.getIdToken(true)
        console.log("ID token refreshed successfully")
      } catch (error) {
        console.error("Failed to refresh token:", error)
      }
    }

    // Refresh immediately if token is close to expiration
    const checkAndRefresh = async () => {
      try {
        const tokenResult = await firebaseUser.getIdTokenResult()
        const expirationTime = new Date(tokenResult.expirationTime).getTime()
        const currentTime = Date.now()
        const timeUntilExpiration = expirationTime - currentTime

        // If token expires in less than 10 minutes, refresh now
        if (timeUntilExpiration < 10 * 60 * 1000) {
          await refreshToken()
        }
      } catch (error) {
        console.error("Failed to check token expiration:", error)
      }
    }

    // Check immediately on mount
    checkAndRefresh()

    // Set up periodic refresh every 50 minutes
    const refreshInterval = setInterval(refreshToken, 50 * 60 * 1000)

    return () => {
      clearInterval(refreshInterval)
    }
  }, [firebaseUser])

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
