/**
 * Firebase Admin SDK initialization for server-side operations
 * Handles secure token verification and admin operations
 */

import admin from "firebase-admin"

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
  try {
    // Check if we have service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (serviceAccount) {
      // Initialize with service account (production)
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    } else {
      // Initialize without service account (development - uses application default credentials)
      // NOTE: This requires GOOGLE_APPLICATION_CREDENTIALS env var or running on GCP
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }

    console.log("Firebase Admin SDK initialized successfully")
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error)
    // Still initialize with minimal config to prevent crashes
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }
  }
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()

export default admin
