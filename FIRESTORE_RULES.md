# Firestore Security Rules

## Current Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /profiles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own quota
    match /profile_quota/{quotaId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    // Interview sessions - users can read/write their own
    match /interview_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid;
    }
    
    // Promo code usage - users can read their own, create their own
    match /promo_code_usage/{usageId} {
      allow read: if request.auth != null && 
        (resource == null || resource.data.user_id == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid;
    }
  }
}
```

## Important Notes

1. **Profile Creation**: The `write` rule for `/profiles/{userId}` covers both create and update operations. The document ID (`userId`) must match the authenticated user's UID (`request.auth.uid`).

2. **Testing Rules**: You can test these rules in the Firebase Console under Firestore → Rules → Rules Playground.

3. **Common Issues**:
   - If profiles aren't being created, check the browser console for permission-denied errors
   - Ensure the user is fully authenticated before attempting to write
   - The document ID must exactly match the user's UID

## Troubleshooting Profile Creation

If a profile isn't being created:

1. **Check Browser Console**: Look for error messages with codes like:
   - `permission-denied` - Security rules are blocking the write
   - `unauthenticated` - User is not authenticated
   - `unavailable` - Network/Firestore service issue

2. **Verify User UID**: The user's UID from Firebase Authentication must match the document ID in Firestore

3. **Test Rules**: Use the Rules Playground in Firebase Console to simulate writes

4. **Check Authentication State**: Ensure `onAuthStateChanged` has fired and the user is authenticated before creating the profile
