/**
 * Firebase configuration and initialization
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getAnalytics, Analytics } from "firebase/analytics"

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

// Log Firebase config (without sensitive values)
console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket
})

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp
if (getApps().length === 0) {
  console.log('Initializing new Firebase app instance')
  app = initializeApp(firebaseConfig)
} else {
  console.log('Using existing Firebase app instance')
  app = getApps()[0]
}

// Initialize Firebase services
console.log('Initializing Firebase Auth and Firestore')
export const auth = getAuth(app)
console.log('Firebase Auth initialized')

export const db = getFirestore(app)
console.log('Firestore initialized')

// Initialize Analytics only on client side
export const analytics: Analytics | null =
  typeof window !== "undefined" ? getAnalytics(app) : null

export default app

