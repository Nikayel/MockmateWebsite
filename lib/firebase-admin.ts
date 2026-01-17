/**
 * Firebase Admin SDK initialization for server-side operations
 * Handles secure token verification and admin operations
 */

import admin from "firebase-admin"
import { logger } from "./logger"

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
  try {
    // Check if we have service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

    if (!projectId) {
      logger.error("Firebase Admin SDK: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set")
      throw new Error("Firebase project ID is required for Admin SDK initialization")
    }

    if (serviceAccount) {
      try {
        // Initialize with service account (production)
        const serviceAccountJson = JSON.parse(serviceAccount)
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJson),
          projectId: projectId,
        })
        logger.info("Firebase Admin SDK initialized with service account")
      } catch (parseError) {
        logger.error("Firebase Admin SDK: Failed to parse service account JSON", { error: parseError })
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.")
      }
    } else {
      // Initialize without service account (development - uses application default credentials)
      // NOTE: This requires GOOGLE_APPLICATION_CREDENTIALS env var or running on GCP
      logger.warn("Firebase Admin SDK: No service account key found, using application default credentials", {
        note: "Requires GOOGLE_APPLICATION_CREDENTIALS env var or running on GCP"
      })

      admin.initializeApp({
        projectId: projectId,
      })
      logger.info("Firebase Admin SDK initialized with default credentials")
    }
  } catch (error) {
    logger.error("Error initializing Firebase Admin SDK", { error })

    // Still initialize with minimal config to prevent crashes
    // But token verification will likely fail
    if (!admin.apps.length) {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      if (projectId) {
        try {
          admin.initializeApp({
            projectId: projectId,
          })
          logger.warn("Firebase Admin SDK initialized with minimal config (token verification may fail)")
        } catch (minimalError) {
          logger.error("Failed to initialize Firebase Admin SDK even with minimal config", {
            error: minimalError,
            note: "This will cause authentication failures in API routes"
          })
        }
      } else {
        logger.error("Cannot initialize Firebase Admin SDK: No project ID available")
      }
    }
  }
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
export const FieldValue = admin.firestore.FieldValue

export default admin
