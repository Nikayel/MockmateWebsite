/**
 * Lazy Firebase initialization for better performance
 *
 * This module provides lazy-loaded Firebase services that are only
 * initialized when first accessed. This prevents blocking the initial
 * page load with Firebase SDK initialization.
 */

import type { FirebaseApp } from "firebase/app"
import type { Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"
import type { Analytics } from "firebase/analytics"

// Cached instances
let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let analyticsInstance: Analytics | null = null

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
}

// Validate Firebase configuration
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ] as const

  const missingFields: string[] = []

  for (const field of requiredFields) {
    if (!firebaseConfig[field]) {
      missingFields.push(`NEXT_PUBLIC_FIREBASE_${field.toUpperCase().replace(/([A-Z])/g, '_$1')}`)
    }
  }

  if (missingFields.length > 0) {
    const errorMessage = `Missing required Firebase environment variables: ${missingFields.join(', ')}`
    console.error('❌ Firebase Configuration Error:', errorMessage)

    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      throw new Error(errorMessage)
    }
  }
}

/**
 * Lazily initialize Firebase app
 */
async function getApp(): Promise<FirebaseApp> {
  if (app) return app

  validateFirebaseConfig()

  const { initializeApp, getApps } = await import("firebase/app")

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }

  return app
}

/**
 * Lazily get Firebase Auth instance
 */
export async function getAuthLazy(): Promise<Auth> {
  if (authInstance) return authInstance

  const firebaseApp = await getApp()
  const { getAuth } = await import("firebase/auth")
  authInstance = getAuth(firebaseApp)

  return authInstance
}

/**
 * Lazily get Firestore instance
 */
export async function getDbLazy(): Promise<Firestore> {
  if (dbInstance) return dbInstance

  const firebaseApp = await getApp()
  const { getFirestore } = await import("firebase/firestore")
  dbInstance = getFirestore(firebaseApp)

  return dbInstance
}

/**
 * Lazily get Analytics instance (client-side only)
 */
export async function getAnalyticsLazy(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null
  if (analyticsInstance) return analyticsInstance

  const firebaseApp = await getApp()
  const { getAnalytics } = await import("firebase/analytics")
  analyticsInstance = getAnalytics(firebaseApp)

  return analyticsInstance
}

/**
 * Get all Firebase services at once (for components that need multiple)
 */
export async function getFirebaseServices() {
  const [auth, db] = await Promise.all([
    getAuthLazy(),
    getDbLazy()
  ])

  return { auth, db }
}
