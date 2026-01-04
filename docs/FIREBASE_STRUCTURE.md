# Firebase Structure Guide

This document explains the Firestore database structure for the CodeSparring platform.

## Overview

```
Firestore Database
├── profiles/                    # User profiles (MAIN USER DATA)
├── interview_sessions/          # Interview session records
├── analytics_events/            # Custom analytics events
├── usage_events/                # AI API usage events
├── users/{userId}/              # User-specific subcollections
│   └── usage_summaries/         # Monthly AI usage aggregates
├── payment_history/             # Stripe payment records
├── admin_roles/                 # Admin RBAC (optional)
├── admin_audit_log/             # Admin action logs
└── ... other collections
```

---

## Collections

### `profiles` - User Profiles

**Document ID**: Firebase Auth UID (MUST match Auth UID)

```typescript
{
  id: string,                    // Firebase Auth UID
  email: string,                 // User email
  full_name: string,             // Display name
  avatar_url?: string,           // Profile picture URL

  // Subscription
  subscription_tier: "free" | "pro" | "enterprise",
  subscription_status: "active" | "past_due" | "canceled" | null,
  stripe_customer_id?: string,   // Stripe customer ID
  stripe_subscription_id?: string,

  // Timestamps
  created_at: string,            // ISO timestamp
  updated_at: string,            // ISO timestamp
}
```

**⚠️ IMPORTANT**: The document ID MUST be the Firebase Auth UID. If they don't match, admin access and other features break.

---

### `interview_sessions` - Session Records

```typescript
{
  id: string,                    // Auto-generated
  user_id: string,               // Firebase Auth UID

  // Session details
  type: "dsa" | "system_design" | "behavioral" | "bug_fix",
  difficulty: "easy" | "medium" | "hard",
  scenario_id?: string,

  // Status
  session_state: "in_progress" | "completed" | "abandoned",
  started_at: string,            // ISO timestamp
  completed_at?: string,         // ISO timestamp (if completed)

  // Results
  performance_score?: number,    // 0-100
  feedback?: object,
}
```

---

### `analytics_events` - Custom Events

```typescript
{
  event_name: string,            // e.g., "code_execution", "error", "ai_chat"
  timestamp: string,             // ISO timestamp
  source: "client" | "server",
  properties: {
    // Event-specific data
    userId?: string,
    sessionId?: string,
    // ... varies by event type
  }
}
```

---

### `usage_events` - AI API Calls

```typescript
{
  userId: string,
  eventType: "chat_message" | "feedback_generation" | "code_execution" | "hint_request",
  provider: "gemini" | "claude" | "gpt-4o" | "deepseek",
  model?: string,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
  cost: number,                  // USD
  latencyMs: number,
  cached: boolean,
  sessionId?: string,
  createdAt: Timestamp,
}
```

---

### `users/{userId}/usage_summaries` - Monthly Aggregates

**Document ID**: `YYYY-MM` (e.g., "2025-01")

```typescript
{
  userId: string,
  periodStart: Timestamp,
  periodEnd: Timestamp,
  totalCost: number,             // Total AI cost for period
  totalTokens: number,
  totalRequests: number,
  requestsByType: Record<string, number>,
  requestsByProvider: Record<string, number>,
  cacheHits: number,
  cacheMisses: number,
  totalLatencyMs: number,
  updatedAt: Timestamp,
}
```

---

### `payment_history` - Stripe Payments

```typescript
{
  id: string,                    // Stripe payment intent ID
  userId: string,
  amount: number,                // In cents
  currency: string,
  status: "succeeded" | "failed" | "pending",
  description?: string,
  created_at: Timestamp,
}
```

---

### `admin_roles` - RBAC (Optional)

**Document ID**: Firebase Auth UID

```typescript
{
  userId: string,
  email: string,
  role: "super_admin" | "admin" | "analyst" | "support",
  grantedBy: string,             // UID of granting admin
  grantedAt: Timestamp,
  lastAccess?: Timestamp,
  active: boolean,
}
```

**Note**: The primary admin is set via `ADMIN_USER_ID` env var. This collection is for additional admins.

---

## Common Issues

### 1. Profile ID ≠ Auth UID

**Problem**: When you sign up, the profile document ID should be created with the Firebase Auth UID. If they're different, things break.

**How to check**:
1. Go to Firebase Console → Authentication → Users
2. Find your email, copy the UID
3. Go to Firestore → profiles
4. The document ID should match the UID

**Fix**: If they don't match, either:
- Delete the mismatched profile and let the app recreate it
- Manually update the document ID (requires export/import)

### 2. Missing Firestore Rules

Make sure your `firestore.rules` allows:
- Users to read/write their own profile
- Users to read/write their own sessions
- Admin SDK (server) to access admin collections

### 3. Missing Indexes

If you see "requires an index" errors, click the link in the error to create it, or check `firestore.indexes.json`.

---

## Environment Variables

```bash
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (server-only, secret)
FIREBASE_SERVICE_ACCOUNT_KEY=   # JSON string or path

# Admin Access
ADMIN_USER_ID=                  # Firebase Auth UID of primary admin
```

---

## Firestore Security Rules Summary

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Profiles - users can only access their own
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Sessions - users can only access their own
    match /interview_sessions/{sessionId} {
      allow read, write: if request.auth != null
        && resource.data.user_id == request.auth.uid;
    }

    // Analytics - write only (for client events)
    match /analytics_events/{docId} {
      allow create: if request.auth != null;
    }

    // Admin collections - server only (Firebase Admin SDK bypasses rules)
    match /admin_roles/{docId} {
      allow read, write: if false; // Admin SDK only
    }
  }
}
```

---

## Quick Reference

| What | Where | Document ID |
|------|-------|-------------|
| User profile | `profiles/{uid}` | Firebase Auth UID |
| User sessions | `interview_sessions/{auto}` | Auto-generated |
| Monthly usage | `users/{uid}/usage_summaries/{YYYY-MM}` | Year-Month |
| Admin role | `admin_roles/{uid}` | Firebase Auth UID |
| Stripe payment | `payment_history/{paymentId}` | Stripe ID |

---

## Admin Access Flow

1. User logs in → Gets Firebase ID token
2. Frontend calls `/api/admin/analytics` with Bearer token
3. API verifies token with Firebase Admin SDK
4. API checks if UID matches `ADMIN_USER_ID` env var OR exists in `admin_roles`
5. If authorized, returns data; otherwise returns 403
