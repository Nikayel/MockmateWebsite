# Mockmate Platform Audit Report

**Date:** January 1, 2026
**Branch:** `claude/platform-audit-security-xpAIu`
**Status:** Pre-Launch Security & Quality Audit

---

## Executive Summary

This comprehensive audit covers all critical systems: RAG/AI, Security, Sessions/Questions, UI/UX, and Payments. The platform has **strong foundations** but requires fixes in several areas before launch.

| Area | Status | Critical Issues | High Issues | Action Required |
|------|--------|-----------------|-------------|-----------------|
| Security | ⚠️ NEEDS WORK | 2 | 6 | Immediate fixes |
| Payments | ⚠️ NEEDS WORK | 5 | 4 | Immediate fixes |
| RAG/AI | ✅ GOOD | 2 | 4 | Short-term fixes |
| Sessions | ⚠️ NEEDS WORK | 0 | 4 | Short-term fixes |
| UI/UX | ✅ GOOD | 0 | 2 | Medium-term |

---

## CRITICAL ISSUES (Must Fix Before Launch)

### 1. [SECURITY] CSP Uses unsafe-eval and unsafe-inline
**File:** `next.config.mjs:59-74`
```javascript
// CURRENT (VULNERABLE)
"script-src 'self' 'unsafe-eval' 'unsafe-inline' ..."
```
**Risk:** XSS attacks can execute arbitrary JavaScript
**Fix:** Remove unsafe directives, use nonce-based CSP

### 2. [SECURITY] Missing Server-Side Admin Route Protection
**File:** `app/admin/layout.tsx:56-89`
**Risk:** Admin pages briefly visible before client-side redirect
**Fix:** Implement Next.js middleware for server-side auth check

### 3. [PAYMENT] No Price ID Whitelist Validation
**File:** `app/api/create-checkout/route.ts:61-75`
**Risk:** Environment variable manipulation could allow free access
**Fix:** Hardcode allowed price IDs with validation

### 4. [PAYMENT] Race Condition in Webhook Profile Updates
**File:** `app/api/webhook/stripe/route.ts:268-285`
**Risk:** Concurrent webhooks can corrupt subscription data
**Fix:** Use Firestore transactions for all profile updates

### 5. [PAYMENT] No Check for Existing Subscription
**File:** `app/api/create-checkout/route.ts`
**Risk:** Users can accidentally purchase duplicate subscriptions
**Fix:** Check for active subscription before creating checkout

### 6. [PAYMENT] Soft Quota Enforcement Only
**File:** `lib/quota-enforcement.ts:113-118`
**Risk:** Concurrent requests can bypass session limits
**Fix:** Atomic quota check with Firestore transaction

### 7. [RAG] Metadata Serialization Data Loss
**File:** `lib/rag/vectordb/pinecone.ts:142-175`
**Risk:** Arrays with commas lose data when flattened
**Fix:** Use JSON serialization instead of comma-separated

### 8. [RAG] No Hallucination Prevention
**Risk:** AI can generate facts outside retrieved context
**Fix:** Add constraint validation in prompt engineering

---

## HIGH PRIORITY ISSUES

### Security
1. **PII in Error Logs** - `lib/logger.ts` - Add PII redaction
2. **Delete Account Missing Rate Limiting** - `app/api/delete-account/route.ts`
3. **Missing Input Validation** - Multiple API routes lack zod schema validation
4. **Webhook Secret Fallback** - Should fail fast if not configured
5. **HSTS Missing Preload** - `next.config.mjs:36`
6. **Admin Query Params Not Validated** - `lib/admin/middleware.ts:169-206`

### Payments
1. **Invoice.paid Doesn't Always Reset Usage** - Different billing reasons ignored
2. **Customer Lookup Ambiguity** - Email-based sync can fail
3. **Instant Refund Downgrade** - No grace period unlike cancellations
4. **Concurrent Webhook Protection** - No optimistic locking

### Sessions
1. **Session Completion Race** - Firestore update can fail silently
2. **Multiple Tabs Overwrite Code** - No conflict detection
3. **20-Message History Limit** - Context loss on long interviews
4. **Language Not Supported But Allows Submit** - Confusing errors

### RAG
1. **No Token Counting** - Character limits don't match tokens
2. **Hardcoded Pattern Expansion** - Limited to 8 patterns
3. **Query Expansion False Positives** - "window" matches unrelated
4. **Missing Result Deduplication** - Similar results from expansions

### UI/UX
1. **Color Contrast Issues** - Switch and badge components
2. **Form Validation Missing** - No React Hook Form/schema validation

---

## MEDIUM PRIORITY ISSUES

### Security
- CSRF sameSite should be "lax" not "strict"
- Admin role check should be cached
- Promo codes hardcoded in source
- X-Frame-Options should be DENY
- Content-Type not validated on API endpoints

### Payments
- Promo codes in source code (move to DB)
- Timezone-unaware billing periods
- Cron job has no alerting
- Partial refunds not handled

### Sessions
- Browser refresh loses session params
- Auto-save failures not retried
- Abandoned sessions never expire
- Scenario versioning missing

### RAG
- Embedding cache uses simple FIFO (use LRU)
- Recency boost too weak (0.1 weight)
- Threshold inconsistency across files
- Fire-and-forget Firestore backup

### UI/UX
- Missing ARIA attributes on icons
- No skip-to-content navigation
- Form labels not properly associated
- Loading spinner inconsistency

---

## FIX IMPLEMENTATION PLAN

### Phase 1: Critical Security & Payment Fixes (This PR)

#### 1.1 Fix CSP Headers
```javascript
// next.config.mjs - Remove unsafe directives
"script-src 'self' https://js.stripe.com https://*.firebaseapp.com ..."
"style-src 'self' https://fonts.googleapis.com ..."
```

#### 1.2 Add Admin Middleware
```typescript
// middleware.ts - Server-side admin protection
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Verify admin token server-side
  }
}
```

#### 1.3 Fix Payment Race Conditions
```typescript
// Use Firestore transactions for all profile updates
await adminDb.runTransaction(async (tx) => {
  const snap = await tx.get(profileRef)
  // Atomic read-modify-write
})
```

#### 1.4 Add Price ID Validation
```typescript
const ALLOWED_PRICE_IDS = {
  website_monthly: process.env.STRIPE_PRICE_ID_WEBSITE_MONTHLY,
  website_yearly: process.env.STRIPE_PRICE_ID_WEBSITE_YEARLY,
}
// Validate at checkout creation
```

#### 1.5 Check Existing Subscription
```typescript
if (profile?.subscription_tier === 'pro' && profile?.subscription_status === 'active') {
  return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
}
```

### Phase 2: High Priority Fixes (Next Sprint)
- Add zod validation to all API routes
- Implement PII redaction in logger
- Add rate limiting to delete-account
- Fix session completion with retry logic
- Add multi-tab conflict detection

### Phase 3: Medium Priority (Following Sprint)
- Move promo codes to Firestore
- Implement token counting for context
- Add LRU cache for embeddings
- Fix accessibility issues
- Add form validation library

---

## TESTING CHECKLIST

### Security Tests
- [ ] Verify CSP blocks inline scripts
- [ ] Test admin routes without auth
- [ ] Verify webhook signature validation
- [ ] Test rate limiting on all endpoints
- [ ] Verify CSRF protection

### Payment Tests
- [ ] Test duplicate subscription prevention
- [ ] Verify quota enforcement atomicity
- [ ] Test webhook idempotency
- [ ] Verify refund handling
- [ ] Test subscription sync edge cases

### Session Tests
- [ ] Test browser refresh recovery
- [ ] Test multi-tab scenarios
- [ ] Verify session completion persists
- [ ] Test network failure handling

### UI/UX Tests
- [ ] Run axe-core accessibility audit
- [ ] Test on mobile devices
- [ ] Verify color contrast ratios
- [ ] Test keyboard navigation

---

## FILES TO MODIFY

### Critical Fixes
1. `next.config.mjs` - CSP headers
2. `middleware.ts` (new) - Admin route protection
3. `app/api/webhook/stripe/route.ts` - Transaction fixes
4. `app/api/create-checkout/route.ts` - Price validation, subscription check
5. `lib/quota-enforcement.ts` - Atomic quota checks
6. `lib/rag/vectordb/pinecone.ts` - JSON serialization

### High Priority
7. `lib/logger.ts` - PII redaction
8. `app/api/delete-account/route.ts` - Rate limiting
9. `lib/admin/middleware.ts` - Query param validation
10. `app/api/chat/route.ts` - Token counting
11. `lib/rag/retrieval/advanced-retrieval.ts` - Deduplication

---

## CONCLUSION

The platform is **architecturally sound** with good practices in many areas:
- ✅ Proper Firebase auth integration
- ✅ Webhook signature verification
- ✅ Idempotency for payments
- ✅ Circuit breaker for RAG
- ✅ Error boundaries in UI

However, **9 critical issues** must be fixed before launch to prevent:
- Security vulnerabilities (XSS, unauthorized access)
- Revenue loss (subscription bypass, duplicate charges)
- Data corruption (race conditions)
- User frustration (session loss, quota bypass)

**Estimated fix time:** 16-24 hours for critical issues

---

*Report generated by comprehensive platform audit*
