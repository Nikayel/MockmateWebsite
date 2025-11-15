# Firebase Database Setup Checklist

## ✅ Current Database Status

Your Firestore database needs these collections. They will be **automatically created** when users interact with the app:

### 1. `profiles` Collection
**Status**: ✅ Auto-created on user login
- Created when: User signs in for the first time
- Document ID: User's Firebase UID
- Fields:
  - `id`: string (same as document ID)
  - `email`: string
  - `full_name`: string (optional)
  - `avatar_url`: string (optional)
  - `subscription_tier`: "free" | "pro" | "enterprise" (defaults to "free")
  - `subscription_platform`: "website" | "vscode" (optional)
  - `created_at`: timestamp
  - `updated_at`: timestamp

### 2. `profile_quota` Collection
**Status**: ✅ Auto-created when user starts first interview
- Created when: User starts their first interview session
- Document ID: Auto-generated
- Fields:
  - `id`: string
  - `user_id`: string (Firebase UID)
  - `sessions_used`: number (starts at 0)
  - `sessions_limit`: number (2 for free, unlimited for pro)
  - `period_start`: timestamp (start of current month)
  - `period_end`: timestamp (end of current month)
  - `created_at`: timestamp
  - `updated_at`: timestamp

### 3. `interview_sessions` Collection (Future)
**Status**: ⏳ Not yet implemented
- Will store: Interview session history, performance data
- Created when: User completes an interview session

## 🔒 Security Rules

Make sure you've set up Firestore security rules in Firebase Console:

1. Go to **Firestore Database** → **Rules** tab
2. Copy the rules from `FIREBASE_SETUP.md` (lines 53-77)
3. Click **Publish**

## 📊 What You Need to Do in Firebase Console

### ✅ Already Done:
- [x] Firebase project created
- [x] GitHub OAuth enabled (you mentioned you can login)
- [x] Firestore Database created

### ⚠️ Still Need to Do:
- [ ] **Set Firestore Security Rules** (if not done yet)
  - Go to Firestore Database → Rules
  - Paste the rules from `FIREBASE_SETUP.md`
  
- [ ] **Verify Collections are Created** (will happen automatically)
  - After first user login: Check `profiles` collection
  - After first interview: Check `profile_quota` collection

## 🧪 Testing Database Setup

1. **Test Profile Creation**:
   - Log in with GitHub
   - Go to Firebase Console → Firestore Database
   - You should see a document in `profiles` collection with your UID

2. **Test Quota Creation**:
   - Start an interview session
   - Go to Firebase Console → Firestore Database
   - You should see a document in `profile_quota` collection

3. **Test Usage Tracking**:
   - Complete an interview
   - Check `profile_quota` document
   - `sessions_used` should increment

## 📝 No Manual Database Changes Needed!

The code automatically:
- ✅ Creates profiles on login
- ✅ Creates quotas when needed
- ✅ Tracks usage automatically
- ✅ Resets quotas monthly (handled by code)

You don't need to manually create any collections or documents!

