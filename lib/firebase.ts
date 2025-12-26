/**
 * Firebase configuration and initialization
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getAnalytics, Analytics } from "firebase/analytics"

// Development mode check - logs only appear in development
const isDev = process.env.NODE_ENV === 'development'

// Your web app's Firebase configuration
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
    if (isDev) {
      console.error('Firebase Configuration Error:', errorMessage)
      console.error('Please ensure all required environment variables are set in your .env.local file')
    }

    // In development, throw error to prevent silent failures
    if (typeof window !== "undefined" && isDev) {
      throw new Error(errorMessage)
    }
  }
}

// Validate config before initialization
validateFirebaseConfig()

// Log Firebase config (without sensitive values) - dev only
if (isDev) {
  console.log('Initializing Firebase with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId
  })
}

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp
try {
  if (getApps().length === 0) {
    if (isDev) console.log('Initializing new Firebase app instance')
    app = initializeApp(firebaseConfig)
  } else {
    if (isDev) console.log('Using existing Firebase app instance')
    app = getApps()[0]
  }
} catch (error: any) {
  if (isDev) {
    console.error('Firebase initialization error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
  }

  // Provide helpful error messages
  if (error.code === 'app/invalid-app-credentials') {
    throw new Error('Invalid Firebase configuration. Please check your environment variables.')
  } else if (error.code === 'app/duplicate-app') {
    if (isDev) console.warn('Firebase app already initialized, using existing instance')
    app = getApps()[0]
  } else {
    throw error
  }
}

// Initialize Firebase services
if (isDev) console.log('Initializing Firebase Auth and Firestore')
let authInstance: Auth
let dbInstance: Firestore

try {
  authInstance = getAuth(app)
  if (isDev) console.log('Firebase Auth initialized')

  dbInstance = getFirestore(app)
  if (isDev) console.log('Firestore initialized')
} catch (error: any) {
  if (isDev) console.error('Firebase service initialization error:', error)
  throw new Error(`Failed to initialize Firebase services: ${error.message}`)
}

// Export initialized services
export const auth = authInstance
export const db = dbInstance

// Initialize Analytics only on client side
export const analytics: Analytics | null =
  typeof window !== "undefined" ? getAnalytics(app) : null

export default app

