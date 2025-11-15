# Firebase Setup Guide

## 1. Enable GitHub Authentication

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Click **Add new provider** → Select **GitHub**
3. You'll need to create a GitHub OAuth App:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - **Application name**: MockMate
   - **Homepage URL**: `https://your-domain.com` (or `http://localhost:3000` for dev)
   - **Authorization callback URL**: `https://danuxx-42bf3.firebaseapp.com/__/auth/handler`
   - Copy the **Client ID** and **Client Secret**
4. Back in Firebase, paste:
   - **Client ID**: (from GitHub)
   - **Client Secret**: (from GitHub)
5. Click **Save**

## 2. Set Up Firestore Collections

### Collection: `profiles`
- **Document ID**: User's Firebase UID (auto-generated)
- **Fields**:
  ```
  id: string (same as document ID)
  email: string
  full_name: string (optional)
  avatar_url: string (optional)
  subscription_tier: string ("free" | "pro" | "enterprise")
  subscription_platform: string ("website" | "vscode") (optional)
  created_at: timestamp
  updated_at: timestamp
  ```

### Collection: `profile_quota`
- **Document ID**: Auto-generated
- **Fields**:
  ```
  id: string
  user_id: string (Firebase UID)
  sessions_used: number
  sessions_limit: number
  period_start: timestamp
  period_end: timestamp
  created_at: timestamp
  updated_at: timestamp
  ```

## 3. Firestore Security Rules

Go to **Firestore Database** → **Rules** tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own quota
    match /profile_quota/{quotaId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    // Interview sessions (for future use)
    match /interview_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
  }
}
```

## 4. Update Environment Variables

Update `.env.local` to remove Supabase references (Firebase config is in code):

```env
# Firebase Configuration (already in lib/firebase.ts)
# No env vars needed for Firebase client SDK

# Anthropic API Key (for AI chat)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Website URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 5. Test the Setup

1. **Test Authentication**:
   - Go to `/login`
   - Click "Continue with GitHub"
   - Should redirect and sign you in

2. **Test Profile Creation**:
   - After first login, go to `/account`
   - Profile should be created automatically if it doesn't exist

3. **Test Firestore**:
   - Check Firebase Console → Firestore
   - You should see a `profiles` document with your user ID

## 6. Create Initial Profile Document (Optional)

You can manually create a test profile in Firestore Console:

1. Go to Firestore Database → Data tab
2. Click **+ Start collection** (if `profiles` doesn't exist)
3. Collection ID: `profiles`
4. Document ID: (your Firebase UID - get it from Authentication tab)
5. Add fields:
   - `email`: string
   - `subscription_tier`: string = "free"
   - `created_at`: timestamp = now
   - `updated_at`: timestamp = now

## 7. VS Code Extension Configuration

Update the extension to use Firebase instead of Supabase:

1. Update `extension/VScodeExtension/nikayel/src/supabase/` files
2. Replace Supabase calls with Firebase Admin SDK (server-side)
3. Or use Firebase REST API from extension

## Notes

- Firebase client SDK works directly in the browser (no env vars needed)
- For server-side operations (API routes), use Firebase Admin SDK
- GitHub OAuth callback URL must match exactly in Firebase and GitHub
- Firestore security rules are important - test them thoroughly

