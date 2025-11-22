# MockMate Comprehensive Review & Analytics Roadmap

**Review Date:** November 22, 2025
**Reviewer:** Claude Code
**Purpose:** Edge case analysis, broken feature identification, and future analytics infrastructure planning

---

## Executive Summary

MockMate is a well-architected interview preparation platform with **200+ scenarios**, robust code execution, and solid authentication/payment systems. However, there are **5 critical non-functional features** that need immediate attention, **12+ edge cases** that could cause production issues, and a **minimal analytics infrastructure** that will limit data-driven decision making in 5-10 months.

**Recommendation:** Fix broken features immediately (2-3 days), implement foundational analytics infrastructure NOW (1-2 weeks), defer advanced ML/recommendation systems until you have 500+ active users.

---

## Part 1: BROKEN/NON-FUNCTIONAL FEATURES (FIX NOW)

### 🚨 Critical Issues

#### 1. Dashboard Recent Activity - NOT WORKING
**Location:** `app/dashboard/page.tsx:228-262`

**Issue:** Shows placeholder "No recent sessions" even when user has completed sessions.

**Root Cause:** Component doesn't fetch any session data from Firestore.

**Impact:** Users cannot see their practice history from the dashboard.

**Fix Required:**
```typescript
// Need to add session fetching logic similar to sessions/page.tsx
const sessionsQuery = query(
  collection(db, "interview_sessions"),
  where("user_id", "==", firebaseUser.uid)
)
const sessionsSnap = await getDocs(sessionsQuery)
```

**Priority:** HIGH - User-facing feature, poor UX


#### 2. Dashboard Performance Metrics - PLACEHOLDER
**Location:** `app/dashboard/page.tsx:220-231`

**Issue:** Shows "--" instead of actual performance statistics.

**Root Cause:** No calculation of aggregate metrics across sessions.

**Impact:** Users have no visibility into their progress/improvement.

**Fix Required:**
- Calculate average performance_score from interview_sessions
- Show trend (improving/declining)
- Display total sessions completed
- Show strongest/weakest areas

**Priority:** HIGH - Core value proposition


#### 3. Account Page Recent Activity - PLACEHOLDER
**Location:** `app/account/page.tsx:416-419`

**Issue:** Shows "No recent interview sessions" placeholder, doesn't display actual data.

**Root Cause:** Same as #1 - no Firestore query implemented.

**Impact:** Users cannot review their activity from account page.

**Priority:** MEDIUM - Redundant with /sessions page


#### 4. Subscription Cancellation Webhook - INCOMPLETE
**Location:** `app/api/webhook/stripe/route.ts:96-102`

**Issue:** Handler for `customer.subscription.deleted` and `customer.subscription.updated` has no implementation.

**Code:**
```typescript
if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
  const subscription = event.data.object as Stripe.Subscription
  // This would require querying Firestore by subscription_id
  // For now, we'll handle it in a separate function if needed
}
```

**Impact:**
- Users who cancel subscription remain as "pro" tier
- Users downgraded by Stripe still have pro access
- Potential revenue loss

**Fix Required:** Query Firestore by `stripe_subscription_id` and update tier to "free" + reset quota.

**Priority:** CRITICAL - Financial impact


#### 5. Firebase Analytics - NOT UTILIZED
**Location:** `lib/firebase.ts`

**Issue:** Firebase Analytics initialized but no events tracked anywhere in codebase.

**Impact:** Zero visibility into user behavior, conversion funnels, drop-off points.

**Priority:** HIGH - Needed for growth


---

## Part 2: EDGE CASES & POTENTIAL BUGS

### Code Execution Edge Cases

#### 6. Python Execution Dependency on System Python
**Location:** `app/api/execute/route.ts:171`

**Issue:** Uses `spawn('python3')` which requires Python 3 installed on server.

**Edge Cases:**
- Vercel serverless functions may not have Python3 by default
- Version incompatibility (Python 3.6 vs 3.11)
- Missing libraries (json is built-in, but future scenarios might need numpy/pandas)

**Evidence:** Error handler at line 237 catches `ENOENT` but returns error to user.

**Fix:**
- Add Python to Vercel deployment (vercel.json)
- OR use a dedicated code execution service (Judge0, Piston)
- Document Python version requirement

**Priority:** HIGH - Affects all Python users


#### 7. JavaScript Execution Timeout Race Condition
**Location:** `app/api/execute/route.ts:424-451`

**Issue:** Timeout checked AFTER execution completes, not during.

**Code:**
```typescript
executionResult = await executeJavaScript(fullCode, testCase, scenario.type)

// Check for timeout
if (Date.now() - startTime > TIMEOUT_MS) {
  // This will never trigger because executeJavaScript already completed
}
```

**Impact:** Infinite loops might hang server (VM sandbox has 5s timeout, but test loop has 10s timeout per test case × number of test cases = potential 50s+ hang for 5 test cases).

**Fix:** Wrap execution in Promise.race() with timeout.

**Priority:** MEDIUM - VM sandbox provides backup timeout


#### 8. Test Validation - Two Sum Edge Case
**Location:** `app/api/execute/route.ts:270-278`

**Issue:** Special case validation for two-sum only checks if indices are valid, not if they're unique.

**Edge Case:**
```javascript
// Input: nums = [3, 3], target = 6
// User returns: [0, 0]  // Uses same index twice
// Current code validates this as CORRECT (nums[0] + nums[0] = 6)
```

**Fix:** Add check: `actual[0] !== actual[1]`

**Priority:** LOW - Specific to one problem type


#### 9. Quota Race Condition - Double Charge
**Location:** `lib/firestore-helpers.ts:299-336`

**Issue:** Transaction prevents double increment, but quota is checked BEFORE session starts.

**Race Condition:**
1. User with 1 session remaining opens 2 tabs
2. Both tabs check quota → both see 1 available
3. Both start sessions simultaneously
4. First transaction succeeds (used: 1 → 2)
5. Second transaction FAILS with "Session limit exceeded" error
6. User gets error mid-session, bad UX

**Fix:** Check quota inside transaction, or lock session start to one tab.

**Priority:** MEDIUM - Rare but frustrating


#### 10. Session Reopening - Scenario Mismatch
**Location:** `app/sessions/page.tsx:196-200`

**Issue:** Can reopen in-progress sessions, but no validation that scenario still exists.

**Edge Case:**
- User starts session with scenario ID "dsa-001"
- Admin deletes/renames scenario in scenarios.ts
- User tries to continue → 404 or crash

**Fix:** Check `getScenarioById(session.scenario_id)` before allowing reopen.

**Priority:** LOW - Scenarios rarely change


### Data Integrity Edge Cases

#### 11. Profile Creation - Empty Email
**Location:** `lib/firestore-helpers.ts:23-26`

**Issue:** Logs warning but allows profile creation with empty email.

**Edge Case:**
- GitHub OAuth doesn't always provide email (user can make it private)
- Profile created with email: ""
- Email used for Stripe checkout → Stripe fails
- User cannot subscribe

**Fix:** Require email or prompt user to add email before checkout.

**Priority:** MEDIUM - Affects subscription conversion


#### 12. Subscription Sync - Auto-Sync Loop
**Location:** `app/dashboard/page.tsx:68-100`

**Issue:** Auto-syncs subscription if user has Stripe IDs but tier is "free".

**Edge Case:**
- User cancels subscription in Stripe
- Stripe webhook fails to update Firestore (network error)
- User's tier remains "pro" but Stripe shows "canceled"
- Dashboard auto-sync fetches from Stripe → downgrades to free
- BUT webhook handler (route.ts:96) is incomplete, so this won't work properly

**Fix:** Complete webhook handler first, then auto-sync is safe.

**Priority:** CRITICAL - Related to issue #4


#### 13. Quota Period Rollover - Timezone Issue
**Location:** `lib/firestore-helpers.ts:167-169`

**Issue:** Uses server timezone for period start/end, not user timezone.

**Code:**
```typescript
const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
```

**Edge Case:**
- User in Tokyo (UTC+9) starts session at 2025-01-31 23:30 JST
- Server in San Francisco (UTC-8) thinks it's still 2025-01-31 06:30 PST
- User's quota resets at midnight PST, not midnight JST
- User loses ~17 hours of quota

**Fix:** Store user timezone in profile, calculate quota period in user's timezone.

**Priority:** LOW - Acceptable for MVP, document behavior


#### 14. Performance Score - Null/Undefined Handling
**Location:** `app/sessions/page.tsx:157-164`

**Issue:** Displays performance score only if truthy, but 0 is a valid score.

**Code:**
```typescript
{session.performance_score && (
  // This won't display if score is 0
)}
```

**Fix:** Change to `session.performance_score !== undefined`

**Priority:** LOW - Edge case, unlikely to score exactly 0


#### 15. Firestore Security Rules - Missing Rate Limiting
**Issue:** No mention of rate limiting in Firestore security rules.

**Edge Case:**
- Malicious user writes 100,000 fake analytics events
- Firestore costs spike
- Rules allow writes to `analytics` collection (line not shown, but mentioned in exploration)

**Fix:** Add rate limiting to Firestore rules or use Cloud Functions for analytics writes.

**Priority:** MEDIUM - Cost protection


#### 16. Code Execution - Memory Leak in VM Sandbox
**Location:** `app/api/execute/route.ts:43`

**Issue:** VM sandbox context created per test case, but no explicit cleanup.

**Edge Case:**
- Scenario with 10 test cases
- Each creates a new VM context
- If sandbox objects aren't garbage collected → memory leak
- Serverless function OOM (256MB limit)

**Fix:** Reuse sandbox context or explicitly null references.

**Priority:** LOW - Node.js GC should handle this


#### 17. Stripe Webhook - Replay Attack
**Location:** `app/api/webhook/stripe/route.ts:30`

**Issue:** No idempotency check for webhook events.

**Edge Case:**
- Stripe sends `checkout.session.completed` event
- Server processes it → user upgraded to pro
- Network error → Stripe retries webhook
- Server processes again → no harm (merge: true), but inefficient
- However, if webhook increments a counter → double counting

**Fix:** Store processed event IDs in Firestore, skip if already processed.

**Priority:** LOW - Current code is idempotent (setDoc with merge)


---

## Part 3: MISSING FEATURES FOR USER DATA ANALYTICS (5-10 Months)

### Current State: MINIMAL ANALYTICS

**What you collect but DON'T track:**
- User journey (signup → first session → completion → return)
- Conversion funnels (visitor → signup → paid)
- Feature usage (AI hints clicked, code suggestions accepted)
- Drop-off points (users who start but never complete)
- Error rates (code execution failures, timeout frequency)
- Scenario popularity (which questions users choose)
- Language preference (JavaScript vs Python usage)

### What You Need for Performance Recommendations

To provide "Users who struggle with X also improved by practicing Y" style recommendations in 5-10 months, you need:

#### Foundational Data Layer (START NOW)

**1. Event Tracking System**

**Why now:** Takes time to collect enough data for meaningful insights.

**What to track:**
- Session start (scenario_id, difficulty, language)
- Test execution (passed, failed, execution_time)
- Hint usage (hint_index, time_to_first_hint)
- AI interactions (partner_messages_count, question_quality_score)
- Session completion (duration, final_score, feedback_generated)
- User progression (sessions_completed_this_week, streak_days)

**Implementation:**
```typescript
// Add to lib/analytics.ts
export async function trackEvent(
  userId: string,
  eventName: string,
  properties: Record<string, any>
) {
  await addDoc(collection(db, "analytics_events"), {
    user_id: userId,
    event_name: eventName,
    properties,
    timestamp: new Date().toISOString(),
    session_id: getCurrentSessionId(), // For funnel analysis
  })
}
```

**Storage:** Firestore subcollection `analytics_events` or dedicated time-series DB (Timescale, InfluxDB).

**Cost estimate:** ~$0.10/day for 100 active users × 50 events/day = 5000 writes/day × $0.018/1000 = $0.09


**2. Aggregated Metrics Table**

Store pre-computed metrics to avoid expensive queries:

```typescript
interface UserMetrics {
  user_id: string
  total_sessions: number
  avg_performance_score: number
  strongest_difficulty: "easy" | "medium" | "hard"
  weakest_category: "dsa" | "bugfix" | "system_design"
  preferred_language: "javascript" | "python"
  avg_session_duration_minutes: number
  last_7_days_sessions: number
  last_30_days_sessions: number
  first_session_date: string
  last_session_date: string
  streak_current: number
  streak_best: number
  improvement_rate: number // (recent avg - early avg) / early avg
  updated_at: string
}
```

**Update trigger:** Cloud Function on `interview_sessions` write → recalculate user metrics.


**3. Performance Breakdown by Category**

```typescript
interface CategoryPerformance {
  user_id: string
  category: "arrays" | "strings" | "trees" | "graphs" | "dp" // Add more
  sessions_attempted: number
  avg_score: number
  avg_time_minutes: number
  hint_usage_rate: number // % of sessions where hints used
  improvement_trend: "improving" | "stable" | "declining"
}
```


**4. Recommendation Engine Data (DEFER to 6+ months)**

Wait until you have:
- 500+ active users
- 10,000+ completed sessions
- 3+ months of data

Then build:
- Collaborative filtering (users similar to you improved by...)
- Content-based filtering (you struggled with X, try similar Y)
- Difficulty progression (recommend slightly harder problems)
- Weakness targeting (failed arrays twice → recommend easier array problems)


#### Advanced Analytics (START IN 3-6 MONTHS)

**5. Cohort Analysis**

Group users by:
- Signup date (week/month)
- Subscription tier
- First scenario attempted
- Skill level (inferred from first session performance)

Track retention: % still active after 1 week, 1 month, 3 months.


**6. A/B Testing Framework**

Test variations:
- AI interviewer personality (strict vs friendly)
- Hint timing (immediate vs delayed)
- Difficulty ordering (easy-first vs adaptive)

**Implementation:** Add `experiment_variant` field to user profile.


**7. Predictive Analytics (10+ months)**

Requires ML models:
- Churn prediction (likely to cancel subscription)
- Difficulty recommendation (optimal next challenge)
- Time-to-proficiency estimation (reach target skill level)

**Requires:** Historical data, labeled outcomes, ML pipeline (Python/BigQuery/Vertex AI).


---

## Part 4: IMPLEMENTATION ROADMAP

### Phase 1: Fix Broken Features (IMMEDIATE - 2-3 days)

**Sprint 1A: Dashboard & Account Fixes**
1. Implement session fetching in dashboard (like sessions page)
2. Add performance metrics calculation
3. Fix account page recent activity

**Sprint 1B: Payment System Integrity**
4. Complete subscription cancellation webhook handler
5. Add query by `stripe_subscription_id`
6. Test subscription lifecycle (create → cancel → verify downgrade)

**Testing:**
- Manual test: Cancel subscription in Stripe dashboard → verify webhook triggers → check Firestore updated → verify quota reset
- Automated test: Mock webhook payload → POST to /api/webhook/stripe → assert profile tier = "free"


### Phase 2: Edge Case Hardening (WEEK 2)

**Sprint 2A: Code Execution**
1. Add Python to Vercel deployment config
2. Fix timeout race condition with Promise.race()
3. Add two-sum unique index validation
4. Test with edge cases (empty input, null, undefined)

**Sprint 2B: Data Integrity**
1. Require email before checkout (or collect email in checkout flow)
2. Add scenario existence check before session reopen
3. Fix performance score display (handle 0)

**Testing:**
- Load test: 100 concurrent code executions
- Edge case test suite: null inputs, empty arrays, timeout scenarios


### Phase 3: Foundational Analytics (WEEKS 3-4)

**Sprint 3A: Event Tracking**
1. Create `analytics_events` collection
2. Implement `trackEvent()` helper
3. Add tracking to:
   - Session start/complete (interview/page.tsx)
   - Test execution (api/execute)
   - Hint usage (interview/page.tsx)
   - AI interactions (api/chat)
   - Subscription events (webhook)

**Sprint 3B: Aggregated Metrics**
4. Create Cloud Function: `onSessionComplete`
5. Calculate & update `user_metrics` document
6. Create admin dashboard to view aggregate stats (Next.js admin page)

**Sprint 3C: Dashboard Integration**
7. Fetch metrics from `user_metrics` collection
8. Display trend charts (Chart.js or Recharts)
9. Show personalized insights ("You're improving at arrays!")


### Phase 4: Advanced Analytics (MONTHS 3-6)

**Only start when:**
- 500+ users
- 10,000+ sessions
- Broken features fixed
- Event tracking collecting data for 3+ months

**Features:**
1. Cohort retention analysis
2. Recommendation engine v1 (simple rule-based)
3. A/B testing framework
4. Email digest with weekly progress


### Phase 5: ML-Powered Features (MONTHS 6-12)

**Only start when:**
- 2,000+ users
- 50,000+ sessions
- Data science hire or consultant

**Features:**
1. Predictive churn model
2. Adaptive difficulty engine
3. Personalized learning paths
4. Interview readiness score


---

## Part 5: SHOULD YOU START ANALYTICS NOW?

### ✅ START NOW (Weeks 3-4):

**1. Event Tracking Infrastructure**
- REASON: Data collection takes time. You can't analyze data you didn't collect.
- ANALOGY: You can't predict weather patterns without years of historical data.
- EFFORT: 20-30 hours of development
- COST: ~$5-10/month for 100 active users

**2. Basic Aggregated Metrics**
- REASON: Powers dashboard fixes, provides user value immediately.
- EXAMPLE: "Your average score is 78%, up from 65% last month!"
- EFFORT: 15-20 hours
- COST: Minimal (100 Firestore documents)

**3. Firebase Analytics Integration**
- REASON: Free, easy to set up, provides basic funnels.
- SETUP: Add 10-15 `logEvent()` calls
- EFFORT: 4-6 hours
- COST: FREE


### ⏸️ DEFER (Months 3-6):

**1. Recommendation Engine**
- REASON: Need sufficient data for meaningful recommendations.
- MINIMUM DATA: 500 users, 10,000 sessions, 3 months of history
- RISK: Premature recommendations based on small sample = bad UX

**2. Cohort Analysis**
- REASON: Need multiple cohorts (requires time to pass).
- EARLIEST: Month 3-4 (can compare month 1 vs month 2 vs month 3 signups)

**3. A/B Testing**
- REASON: Need enough traffic for statistical significance.
- MINIMUM: 200+ weekly active users
- RULE OF THUMB: 1000 users per variant for 5% effect size


### 🛑 DO NOT START YET (Months 10+):

**1. Machine Learning Models**
- REASON: Insufficient data, overkill for current scale.
- MINIMUM DATA: 50,000+ sessions, 2000+ users
- ALTERNATIVE: Rule-based systems work fine until then

**2. Custom Analytics Platform**
- REASON: Premature optimization.
- ALTERNATIVE: Use Firestore + Google Data Studio/Looker for now
- WHEN TO BUILD: When you're spending >$500/month on third-party analytics


---

## Part 6: COST-BENEFIT ANALYSIS

### Immediate Fixes (Phase 1 + 2)

**Cost:**
- Development: 40-60 hours
- Opportunity cost: ~1 week of feature development

**Benefit:**
- Prevents revenue loss (subscription cancellation bug)
- Improves retention (users can see progress)
- Reduces churn (dashboard shows value)

**ROI:** 10x (conservative estimate: fixing subscription bug alone saves $500+/month in incorrectly granted Pro access)


### Analytics Infrastructure (Phase 3)

**Cost:**
- Development: 60-80 hours (1.5-2 weeks)
- Infrastructure: $10-20/month
- Opportunity cost: New feature development

**Benefit:**
- Enables data-driven decisions (Which features drive retention? Which scenarios are too hard?)
- Powers recommendation engine in 6 months (can't build without data)
- User value (progress tracking, personalized insights)
- Investor/stakeholder reporting (DAU, retention, engagement metrics)

**ROI:** 5x (better product decisions = higher retention = more revenue)


### Advanced Analytics (Phase 4+)

**Cost:**
- Development: 200+ hours (1-2 months)
- Infrastructure: $100-500/month (depending on scale)
- May require data science hire ($120k+/year)

**Benefit:**
- Competitive differentiation (personalized learning)
- Higher user LTV (better retention, more sessions)
- Premium feature (charge more for AI-powered insights)

**ROI:** 2-3x (at scale)


---

## Part 7: TECHNICAL ARCHITECTURE RECOMMENDATIONS

### Option A: Lightweight (RECOMMENDED FOR NOW)

**Event Storage:** Firestore `analytics_events` collection
**Aggregation:** Cloud Functions (trigger on session complete)
**Visualization:** Google Data Studio (free) or Looker Studio
**Cost:** ~$20/month for 500 users

**Pros:**
- Uses existing stack (Firestore, Cloud Functions)
- No new dependencies
- Scales to 10,000 users easily

**Cons:**
- Firestore not optimized for time-series analytics
- Cloud Functions can be slow for large aggregations


### Option B: Dedicated Analytics (DEFER TO MONTH 6+)

**Event Storage:** PostHog (open source) or Mixpanel
**Aggregation:** Built-in
**Visualization:** Built-in dashboards
**Cost:** ~$100-200/month for 1000 users

**Pros:**
- Purpose-built for product analytics
- Funnel analysis, retention cohorts built-in
- SQL access for custom queries

**Cons:**
- Additional vendor dependency
- Data siloed (not in Firestore)
- Overkill for <500 users


### Option C: Data Warehouse (DEFER TO MONTH 12+)

**Event Storage:** Firestore → BigQuery export
**Aggregation:** dbt + BigQuery scheduled queries
**Visualization:** Looker or Metabase
**ML:** Vertex AI (Google Cloud ML)
**Cost:** ~$500+/month for 5000 users

**Pros:**
- Scales to millions of events
- Full SQL access, complex joins
- ML/AI ready (Python, TensorFlow)

**Cons:**
- Significant engineering overhead
- Expensive at small scale
- Requires data engineer


---

## Part 8: IMMEDIATE ACTION ITEMS

### This Week (Must Do):

1. **Fix subscription cancellation webhook** (2-4 hours)
   - Query Firestore by `stripe_subscription_id`
   - Update tier to "free" and reset quota
   - Test end-to-end

2. **Implement dashboard recent activity** (3-4 hours)
   - Copy logic from sessions/page.tsx
   - Limit to 5 most recent
   - Add "View All" link

3. **Add basic performance metrics** (4-6 hours)
   - Calculate avg score from sessions
   - Show total completed
   - Display trend indicator


### Next Week (Should Do):

4. **Set up Firebase Analytics** (4-6 hours)
   - Add logEvent() to key user actions
   - Track signup, session_start, session_complete, subscription
   - View in Firebase Console

5. **Add event tracking infrastructure** (8-12 hours)
   - Create analytics_events collection
   - Implement trackEvent() helper
   - Add to 5-10 key touchpoints

6. **Fix Python execution** (2-3 hours)
   - Add Python to Vercel config
   - Test with sample scenario


### Month 2 (Nice to Have):

7. **Build user_metrics aggregation** (12-16 hours)
   - Cloud Function on session write
   - Calculate metrics per user
   - Display in dashboard

8. **Create admin analytics dashboard** (20-30 hours)
   - Total users, active users, retention
   - Session stats, revenue metrics
   - Top scenarios, error rates


---

## Part 9: RISKS & MITIGATION

### Risk 1: Analytics Overhead Slows App
**Mitigation:**
- Write events asynchronously (don't block user actions)
- Use Cloud Functions for aggregation (offload from Next.js)
- Sample high-frequency events (e.g., only track 10% of test executions)

### Risk 2: Storage Costs Explode
**Mitigation:**
- Set Firestore TTL on events (delete after 90 days)
- Aggregate to daily summaries, delete raw events
- Budget alerts in Google Cloud Console

### Risk 3: Privacy Concerns (GDPR, CCPA)
**Mitigation:**
- Add privacy policy disclosure
- Allow users to opt out of analytics
- Implement data deletion endpoint (GDPR right to erasure)
- Don't collect PII in events (use user_id, not email)

### Risk 4: Analysis Paralysis
**Mitigation:**
- Start with 5 key metrics (DAU, retention, avg_score, subscription_rate, churn_rate)
- Weekly review, not daily obsession
- Focus on actionable insights, not vanity metrics


---

## Part 10: FINAL RECOMMENDATION

### DO IMMEDIATELY (This Sprint):
✅ Fix 5 broken features (dashboard, webhook)
✅ Fix critical edge cases (Python, subscription sync)
✅ Set up Firebase Analytics (free, 6 hours of work)

### START SOON (Next 2-4 Weeks):
✅ Implement event tracking infrastructure
✅ Build user_metrics aggregation
✅ Create basic admin dashboard

### DEFER (Month 3-6):
⏸️ Recommendation engine (wait for data)
⏸️ Cohort analysis (wait for multiple cohorts)
⏸️ A/B testing (wait for traffic)

### DO NOT START YET (Month 10+):
🛑 Machine learning models
🛑 Custom analytics platform
🛑 Data warehouse (BigQuery/Snowflake)

---

## Conclusion

MockMate has a solid foundation but needs **immediate attention on 5 broken features** and **12+ edge cases**.

For analytics: **START FOUNDATIONAL WORK NOW** (event tracking, basic metrics), **DEFER ADVANCED FEATURES** (ML, recommendations) until you have sufficient data (6+ months, 500+ users).

The worst mistake would be to build advanced analytics too early (wasted effort) OR to delay foundational tracking (you'll regret not having historical data when you're ready to analyze).

**Recommended allocation:**
- Week 1: Fix broken features (100% of effort)
- Week 2: Edge case hardening (80%) + Firebase Analytics setup (20%)
- Week 3-4: Event tracking infrastructure (60%) + new features (40%)
- Month 2+: Review analytics data weekly, build aggregations as needed

**Total investment:** ~100-120 hours over 4 weeks to have production-ready app with analytics foundation.

**Expected outcome:** Zero broken features, resilient edge case handling, data collection in place to enable personalized recommendations in 6-9 months when you have 1000+ users.
