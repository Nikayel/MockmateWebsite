/**
 * Integration-test setup: point the Admin SDK at the local Firestore emulator.
 *
 * FIRESTORE_EMULATOR_HOST makes firebase-admin skip credential validation and
 * route all Firestore traffic to the emulator, so no service account is
 * needed. The project id only has to be non-empty and stable.
 *
 * Deliberately NO module mocks here — see vitest.integration.config.ts.
 */

process.env.FIRESTORE_EMULATOR_HOST ||= "localhost:8080"
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= "codesparring-integration"
process.env.GCLOUD_PROJECT ||= process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
