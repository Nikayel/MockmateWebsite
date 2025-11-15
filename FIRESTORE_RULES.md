# Firestore Security Rules

Copy and paste these rules into Firebase Console → Firestore Database → Rules

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
        resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid;
    }
  }
}
```

## How to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `danuxx-42bf3`
3. Go to **Firestore Database** → **Rules** tab
4. Copy the rules above
5. Click **Publish**

## Important Notes

- These rules allow users to update their own profile (including `subscription_tier`)
- Users can create promo code usage records for themselves
- All operations require authentication (`request.auth != null`)

