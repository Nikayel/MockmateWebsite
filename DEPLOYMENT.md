# Deployment Guide

Complete guide for deploying MockMate to production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Vercel Deployment](#vercel-deployment)
- [Firebase Configuration](#firebase-configuration)
- [Stripe Setup](#stripe-setup)
- [Domain Configuration](#domain-configuration)
- [Monitoring & Observability](#monitoring--observability)
- [CI/CD Pipeline](#cicd-pipeline)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

MockMate uses a fully serverless architecture deployed on Vercel with the following services:

- **Hosting:** Vercel (Next.js app + API routes)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Google Gemini API
- **Payments:** Stripe
- **Domain:** Custom domain (configured in Vercel)

**Deployment Strategy:** GitOps - Push to main branch triggers automatic deployment

---

## Prerequisites

Before deploying, ensure you have:

- [x] Vercel account (free tier works for testing)
- [x] Firebase project created
- [x] Google Cloud project with Gemini API enabled
- [x] Stripe account (for payment features)
- [x] Custom domain (optional, but recommended)
- [x] Git repository (GitHub recommended for best Vercel integration)

### Required CLI Tools

```bash
# Install Vercel CLI
npm install -g vercel

# Install Firebase CLI
npm install -g firebase-tools

# Install pnpm (package manager)
npm install -g pnpm
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/Nikayel/MockmateWebsite.git
cd MockmateWebsite
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Variables

Create environment files for each environment:

#### `.env.local` (Development)

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_dev_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-dev-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-dev-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-dev-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_dev_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_dev_app_id

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_ID_WEBSITE=price_test_xxx
STRIPE_PRICE_ID_VSCODE=price_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

#### `.env.production` (Production - Store in Vercel)

```env
# Firebase Configuration (Production)
NEXT_PUBLIC_FIREBASE_API_KEY=your_prod_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_prod_app_id

# AI Configuration
GEMINI_API_KEY=your_production_gemini_api_key

# Stripe Configuration (Live Mode)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PRICE_ID_WEBSITE=price_live_xxx
STRIPE_PRICE_ID_VSCODE=price_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

**⚠️ SECURITY WARNING:**
- NEVER commit `.env.local` or `.env.production` to git
- Add them to `.gitignore` (already configured)
- Use Vercel's environment variable UI for production secrets
- Rotate keys regularly

---

## Vercel Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Select the repository (e.g., `MockmateWebsite`)

#### Step 2: Configure Project

**Framework Preset:** Next.js (auto-detected)

**Build Settings:**
- Build Command: `pnpm build`
- Output Directory: `.next` (default)
- Install Command: `pnpm install`
- Development Command: `pnpm dev`

**Root Directory:** `./` (default)

#### Step 3: Environment Variables

Add all production environment variables in the Vercel UI:

1. Navigate to Project Settings → Environment Variables
2. Add each variable from `.env.production`
3. Select environment: **Production**, **Preview**, or **Development**
4. For secrets, select **Encrypted**

**Recommended Configuration:**

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | ✅ | ✅ |
| `STRIPE_SECRET_KEY` | ✅ (live) | ❌ (test) | ❌ (test) |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | ❌ |

#### Step 4: Deploy

1. Click "Deploy"
2. Vercel will:
   - Install dependencies
   - Run build
   - Deploy to global edge network
3. Wait for deployment (typically 2-3 minutes)
4. Visit your deployment URL (e.g., `https://mockmate-website.vercel.app`)

### Option 2: Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Post-Deployment Verification

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Run production build locally first
pnpm build
pnpm start
```

---

## Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name (e.g., `mockmate-prod`)
4. Enable Google Analytics (recommended)
5. Create project

### 2. Enable Authentication

1. In Firebase Console → Authentication → Get Started
2. Enable sign-in methods:
   - **GitHub:** Configure OAuth app (see below)
   - **Google:** (Optional) Enable if needed
3. Add authorized domains:
   - `localhost` (for development)
   - `yourdomain.com` (production)
   - `yourapp.vercel.app` (Vercel preview)

#### GitHub OAuth Setup

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in details:
   - **Application name:** MockMate
   - **Homepage URL:** `https://yourdomain.com`
   - **Authorization callback URL:** `https://your-project.firebaseapp.com/__/auth/handler`
4. Save Client ID and Client Secret
5. Add to Firebase Auth → GitHub provider

### 3. Enable Firestore

1. Firebase Console → Firestore Database → Create Database
2. Start in **production mode**
3. Select location (e.g., `us-central1`)
4. Click "Enable"

### 4. Deploy Firestore Security Rules

Create `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User profiles
    match /profiles/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Interview sessions
    match /sessions/{sessionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isOwner(resource.data.userId);
    }

    // Promo code usage
    match /promo_code_usage/{docId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated()
                      && request.resource.data.userId == request.auth.uid
                      && docId.startsWith(request.auth.uid + '_');
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy rules:

```bash
# Initialize Firebase in project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules

# Test rules (optional)
firebase deploy --only firestore:rules --project=mockmate-dev
```

### 5. Get Firebase Config

1. Firebase Console → Project Settings → General
2. Under "Your apps", click "Web" (</> icon)
3. Register app name: "MockMate Web"
4. Copy config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

5. Add these values to Vercel environment variables

---

## Stripe Setup

### 1. Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in
3. Activate account (requires business verification for live mode)

### 2. Create Products

#### Product 1: Website Pro

1. Products → Add Product
2. Name: "MockMate Pro (Website)"
3. Pricing: $X.99 / month (recurring)
4. Copy Price ID → Add to `STRIPE_PRICE_ID_WEBSITE`

#### Product 2: VS Code Pro

1. Products → Add Product
2. Name: "MockMate Pro (VS Code Extension)"
3. Pricing: $X.99 / month (recurring)
4. Copy Price ID → Add to `STRIPE_PRICE_ID_VSCODE`

### 3. Configure Webhook

1. Developers → Webhooks → Add Endpoint
2. Endpoint URL: `https://yourdomain.com/api/webhook/stripe`
3. Description: "MockMate subscription events"
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Add endpoint
6. Copy **Signing Secret** → Add to `STRIPE_WEBHOOK_SECRET`

### 4. Get API Keys

1. Developers → API Keys
2. **Test Mode:**
   - Publishable key: `pk_test_xxx` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key: `sk_test_xxx` → `STRIPE_SECRET_KEY`
3. **Live Mode:** (after activation)
   - Toggle "View test data" off
   - Copy live keys

### 5. Test Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

## Domain Configuration

### 1. Purchase Domain

Recommended registrars:
- Namecheap
- Google Domains
- Cloudflare

### 2. Add Domain to Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain: `yourdomain.com`
3. Add `www.yourdomain.com` (redirects to apex)

### 3. Configure DNS

**Option A: Use Vercel Nameservers (Recommended)**

1. Vercel will provide nameservers:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
2. Update nameservers at your registrar
3. Wait for DNS propagation (up to 48 hours)

**Option B: Use External DNS**

Add these records at your DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | 3600 |
| CNAME | www | cname.vercel-dns.com | 3600 |

### 4. Enable HTTPS

1. Vercel automatically provisions SSL certificate (Let's Encrypt)
2. Wait for certificate issuance (5-10 minutes)
3. Verify HTTPS: `https://yourdomain.com`

### 5. Update Environment Variables

Update `NEXT_PUBLIC_APP_URL` in Vercel:
- Production: `https://yourdomain.com`
- Preview: Auto-generated Vercel URL

---

## Monitoring & Observability

### 1. Vercel Analytics

**Enable in Dashboard:**
1. Project Settings → Analytics
2. Enable Web Analytics (free)
3. Enable Speed Insights (free)

**Features:**
- Real-time visitor tracking
- Performance metrics (Core Web Vitals)
- Deployment analytics

### 2. Firebase Analytics

Already configured via `firebase/analytics` import.

**Events Tracked:**
- Page views
- User sign-ups
- Interview starts/completions
- Custom events (in code)

**View Data:**
Firebase Console → Analytics Dashboard

### 3. Error Tracking (Recommended)

**Setup Sentry:**

```bash
pnpm add @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

**Alternative:** LogRocket, Rollbar, or Datadog

### 4. Uptime Monitoring

**Recommended Services:**
- **UptimeRobot:** Free tier, 5-minute checks
- **Pingdom:** More features, paid
- **StatusCake:** Alternative option

**Monitor these endpoints:**
- `https://yourdomain.com` (homepage)
- `https://yourdomain.com/api/health` (create a health check endpoint)

---

## CI/CD Pipeline

### Current Setup: Git-Based Deployment

**Workflow:**
```
Push to GitHub → Vercel detects change → Auto-deploy
```

**Branches:**
- `main` → Production (yourdomain.com)
- `develop` → Preview (auto-generated URL)
- Feature branches → Preview URLs

### Recommended GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          # Add other required env vars

      - name: Run tests
        run: pnpm test
```

### Pre-Deployment Checklist

Before each production deploy:

- [ ] All tests pass locally
- [ ] Build succeeds without errors
- [ ] Environment variables are up-to-date
- [ ] Database migrations applied (if any)
- [ ] Feature flags configured correctly
- [ ] Changelog updated
- [ ] Stakeholders notified

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

**Via Vercel Dashboard:**
1. Go to Deployments tab
2. Find previous stable deployment
3. Click ••• → "Promote to Production"
4. Confirm rollback

**Via CLI:**
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Database Rollback

**Firestore:**
```bash
# Export current state
gcloud firestore export gs://your-bucket/backup-$(date +%Y%m%d)

# Import previous backup
gcloud firestore import gs://your-bucket/backup-20250119
```

**Note:** Always take backups before major changes

---

## Troubleshooting

### Build Failures

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

**Error: "TypeScript errors"**
- Fix errors shown in output
- Don't use `ignoreBuildErrors: true` in production

### Runtime Errors

**Error: "Firestore permission denied"**
- Check Firestore security rules
- Verify user is authenticated
- Ensure `userId` matches in rules

**Error: "Stripe webhook signature verification failed"**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint URL in Stripe Dashboard
- Ensure raw body is used (not parsed JSON)

### Performance Issues

**Slow API responses:**
- Check Gemini API status
- Verify network connectivity
- Review function logs for timeout errors

**High costs:**
- Review Gemini API usage
- Implement caching
- Check for infinite loops in API calls

### Environment Variable Issues

**Variables not updating:**
1. Vercel → Project Settings → Environment Variables
2. Make changes
3. Trigger new deployment (re-deploy or push)
4. Clear browser cache

---

## Production Checklist

Before going live:

### Security
- [ ] All API keys are in environment variables (not code)
- [ ] Firestore security rules deployed
- [ ] HTTPS enabled and enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Performance
- [ ] Images optimized (Next.js Image component)
- [ ] Bundle size analyzed (`pnpm build`)
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals passing

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Analytics enabled (Firebase + Vercel)
- [ ] Uptime monitoring active
- [ ] Logs accessible

### Business
- [ ] Stripe live mode configured
- [ ] Webhook tested in production
- [ ] Terms of Service and Privacy Policy links added
- [ ] Contact email configured
- [ ] Support system in place

### Testing
- [ ] All user flows tested manually
- [ ] Payment flow tested (test mode first)
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing done (Chrome, Firefox, Safari)

---

## Support

**Deployment Issues:**
- Vercel Support: https://vercel.com/support
- Vercel Community: https://github.com/vercel/next.js/discussions

**Firebase Issues:**
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: Tag `firebase`

**General Questions:**
- Email: devops@mockmate.dev
- GitHub Issues: https://github.com/Nikayel/MockmateWebsite/issues

---

**Last Updated:** 2025-01-20
**Version:** 1.0.0
