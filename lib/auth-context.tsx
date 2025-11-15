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

    // Single auth state listener for the entire app
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!mounted) return

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
      setLoading(false)
      setInitialized(true)
    })

    // Safety timeout to prevent infinite loading
    // Firebase should respond quickly, but if it doesn't, we mark as initialized anyway
    const timeout = setTimeout(() => {
      if (mounted && !initialized) {
        console.warn("Auth initialization timeout - marking as initialized")
        setLoading(false)
        setInitialized(true)
      }
    }, 3000) // 3 second timeout

    return () => {
      mounted = false
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [initialized])

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
