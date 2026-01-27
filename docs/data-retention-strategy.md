# Data Retention & Archival Strategy

## Overview

This document outlines the data retention policies for CodeSparring's Firestore collections. Proper data lifecycle management prevents cost explosion, maintains query performance, and ensures compliance.

## Collection Retention Policies

### High-Volume Collections (CRITICAL)

| Collection | Retention | Archival Target | Rationale |
|------------|-----------|-----------------|-----------|
| `usage_events` | 30 days | BigQuery | High volume (~10k/day at scale), needed for billing disputes |
| `algorithm_research_events` | 90 days | BigQuery | Research data, archive for long-term analysis |
| `email_logs` | 90 days | BigQuery | Compliance audit trail, delivery debugging |
| `rate_limits` | 1 day | None (delete) | Ephemeral rate limiting data |
| `notification_queue` | 7 days | None (delete) | Processed notifications no longer needed |

### Medium-Volume Collections

| Collection | Retention | Archival Target | Rationale |
|------------|-----------|-----------------|-----------|
| `nps_responses` | 1 year | BigQuery | Product analytics, long-term trends |
| `notifications` | 90 days | None | User-facing history, trim old |
| `in_app_notifications` | 30 days | None | UI notification center |
| `user_activities` | 90 days | BigQuery | Behavior analytics |

### Permanent Collections (No TTL)

| Collection | Rationale |
|------------|-----------|
| `profiles` | Core user data, never auto-delete |
| `interview_sessions` | User's practice history, permanent record |
| `subscription_history` | Billing/churn research, compliance |
| `problem_mastery` | Spaced repetition state, must persist |
| `user_learning_state` | Learning progress, must persist |
| `profile_quota` | Billing tracking, keep indefinitely |

## Implementation

### 1. Firestore TTL Policies

Enable Firestore TTL on these collections. Add an `expiresAt` field to documents:

```typescript
// When creating a usage event
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 30) // 30-day TTL

await adminDb.collection('usage_events').add({
  ...eventData,
  createdAt: FieldValue.serverTimestamp(),
  expiresAt: Timestamp.fromDate(expiresAt), // TTL field
})
```

Configure TTL in Firebase Console:
1. Go to Firestore > TTL Policies
2. Add policy for each collection with the `expiresAt` field

### 2. BigQuery Export (Before TTL Deletion)

Set up scheduled exports to BigQuery before data expires:

```bash
# Daily export cron job (run at 2 AM)
gcloud firestore export gs://codesparring-backups/firestore \
  --collection-ids=usage_events,algorithm_research_events,email_logs

# Import to BigQuery
bq load --source_format=FIRESTORE_EXPORT \
  codesparring_analytics.usage_events \
  gs://codesparring-backups/firestore/usage_events
```

### 3. Archival Cron Job

Create `app/api/cron/data-archival/route.ts`:

```typescript
// Archive data older than retention period to BigQuery
// Run daily via Vercel Cron

export async function GET() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 30)

  // 1. Export to BigQuery (via Cloud Function or direct API)
  // 2. Delete archived documents from Firestore

  return Response.json({ archived: true })
}
```

## Query Limits

All admin queries MUST include `.limit()` to prevent unbounded reads:

| Query Type | Recommended Limit |
|------------|-------------------|
| Admin dashboard (all users) | 10,000 |
| Per-user queries | 5,000 |
| Session-specific queries | 1,000 |
| Date-range queries (30 days) | 100,000 |
| Research aggregate queries | 10,000 per cohort |

## Cost Projections

### Without TTL (Current State)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| usage_events docs | 3.6M | 7.2M | 10.8M |
| Storage cost | $6.50/mo | $13/mo | $19.50/mo |
| Read costs (queries) | $20/mo | $80/mo | $200/mo |

### With TTL (After Implementation)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| usage_events docs | 300K | 300K | 300K |
| Storage cost | $0.54/mo | $0.54/mo | $0.54/mo |
| Read costs (queries) | $5/mo | $5/mo | $5/mo |

**Annual Savings: ~$1,000+ by Year 3**

## Monitoring

### Alerts to Set Up

1. **Collection Size Alert**: Warn when any collection exceeds 1M documents
2. **Query Cost Alert**: Warn when daily read quota exceeds 80%
3. **Export Failure Alert**: Alert if BigQuery export fails

### Metrics to Track

- Documents per collection (weekly snapshot)
- Average query latency per collection
- Daily Firestore read/write counts
- BigQuery storage growth

## Migration Plan

### Phase 1: Add Query Limits (DONE)
- [x] NPS queries
- [x] Usage events queries
- [x] Algorithm research queries
- [x] Profile queries

### Phase 2: Add TTL Fields (TODO)
- [ ] Add `expiresAt` to new `usage_events` documents
- [ ] Add `expiresAt` to new `email_logs` documents
- [ ] Add `expiresAt` to new `algorithm_research_events` documents
- [ ] Add `expiresAt` to new `rate_limits` documents

### Phase 3: Enable Firestore TTL (TODO)
- [ ] Configure TTL policy for `usage_events`
- [ ] Configure TTL policy for `email_logs`
- [ ] Configure TTL policy for `algorithm_research_events`
- [ ] Configure TTL policy for `rate_limits`

### Phase 4: BigQuery Archival (TODO)
- [ ] Set up BigQuery dataset
- [ ] Create export Cloud Function
- [ ] Configure daily cron trigger
- [ ] Verify data integrity after export

## Notes

- Always archive BEFORE TTL deletes (TTL runs asynchronously, may delete before export)
- Test TTL on staging environment first
- Keep at least 1 year of data in BigQuery for trend analysis
- Document any collection-specific retention requirements for compliance
