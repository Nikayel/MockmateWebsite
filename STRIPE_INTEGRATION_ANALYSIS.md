# Stripe-Firebase Integration Analysis

## Overview
This document analyzes the complete payment flow between Stripe, Firebase, and the platform to identify edge cases and potential issues.

## Payment Flow Architecture

### 1. Checkout Creation (`/api/create-checkout`)
- **Input**: User authenticated via Firebase ID token
- **Process**: Creates Stripe Checkout Session
- **Output**: Checkout session URL
- **Metadata**: Stores `userId`, `platform`, `planType` in session metadata

### 2. Webhook Processing (`/api/webhook/stripe`)
- **Trigger**: Stripe sends webhook events
- **Events Handled**:
  - `checkout.session.completed` - Initial payment
  - `invoice.paid` - Subscription renewals
  - `invoice.payment_failed` - Failed payments
  - `charge.refunded` - Refunds
  - `customer.subscription.updated` - Subscription changes
  - `customer.subscription.deleted` - Cancellations

### 3. Customer Portal (`/api/customer-portal`)
- **Purpose**: Allow users to manage subscriptions
- **Requires**: Valid Stripe customer ID

### 4. Subscription Sync (`/api/sync-subscription`)
- **Purpose**: Manually sync subscription status from Stripe
- **Fallback**: Used when webhook hasn't processed yet

## Identified Edge Cases & Issues

### ✅ FIXED: Invalid Customer ID in Customer Portal
**Issue**: Customer portal was trying to use customer IDs that don't exist in Stripe (deleted, wrong account, etc.)

**Fix Applied**: 
- Validate customer exists before using it
- Clear invalid customer IDs from profile
- Attempt recovery from subscription ID if available

**Location**: `app/api/customer-portal/route.ts`

### ✅ FIXED: Missing Customer ID for Yearly Plans
**Issue**: For one-time payments (yearly plans), customer ID might not always be in `session.customer`

**Fix Applied**:
- Retrieve customer ID from payment intent if not in session
- Log warning if customer ID cannot be found

**Location**: `app/api/webhook/stripe/route.ts` (yearly plan handler)

### ⚠️ POTENTIAL ISSUES

#### 1. Race Condition: Webhook vs Manual Sync
**Scenario**: User completes checkout, webhook hasn't processed yet, user manually syncs
- **Current Behavior**: Manual sync searches by email, might find subscription
- **Risk**: Low - sync function handles this gracefully
- **Mitigation**: Retry logic in `syncSubscriptionWithRetry`

#### 2. Test vs Live Mode Mismatch
**Scenario**: Profile has test mode customer ID, but using live mode keys
- **Risk**: Medium - customer portal will fail
- **Mitigation**: Validation now catches this and clears invalid IDs
- **Recommendation**: Add environment check in webhook handler

#### 3. Customer Deleted in Stripe
**Scenario**: Customer manually deleted in Stripe Dashboard
- **Current Behavior**: Customer portal validation will catch and clear
- **Risk**: Low - handled by validation
- **Recommendation**: Consider webhook for `customer.deleted` event

#### 4. Multiple Customers with Same Email
**Scenario**: User has multiple Stripe customers (test/live, different accounts)
- **Current Behavior**: `syncSubscriptionFromStripe` checks all customers
- **Risk**: Low - takes first active subscription found
- **Recommendation**: Prefer customer ID over email search

#### 5. Yearly Plan Expiration
**Scenario**: Yearly plan expires, user should be downgraded
- **Current Behavior**: `syncSubscriptionFromStripe` checks `subscription_current_period_end`
- **Risk**: Low - handled in sync function
- **Recommendation**: Add cron job to check expired yearly plans

#### 6. Webhook Event Ordering
**Scenario**: Webhook events arrive out of order
- **Current Behavior**: Idempotency check prevents duplicate processing
- **Risk**: Low - handled by `webhook_events` collection
- **Note**: Uses event ID + idempotency key for deduplication

#### 7. Payment Intent Not Linked to Customer
**Scenario**: For yearly plans, payment intent might not have customer
- **Current Behavior**: Now attempts to retrieve from payment intent
- **Risk**: Low - logs warning if not found
- **Recommendation**: Consider creating customer in checkout session

#### 8. Subscription Status Mismatch
**Scenario**: Profile says "pro" but Stripe subscription is canceled
- **Current Behavior**: `syncSubscriptionFromStripe` corrects this
- **Risk**: Low - sync function handles all statuses
- **Recommendation**: Regular sync checks for Pro users

## Data Flow Diagram

```
User → Checkout → Stripe → Webhook → Firebase Profile
  ↓                                    ↓
  └────────── Manual Sync ────────────┘
```

## Key Collections

### Firebase Collections Used:
1. **`profiles/{userId}`** - User profile with subscription data
2. **`payment_history/{paymentId}`** - Payment history
3. **`webhook_events/{eventId}`** - Webhook idempotency tracking
4. **`profile_quota/{quotaId}`** - Usage quota tracking

### Stripe Objects:
1. **Customer** - Linked to Firebase profile via `stripe_customer_id`
2. **Subscription** - Linked via `stripe_subscription_id`
3. **Checkout Session** - Temporary, contains metadata
4. **Payment Intent** - For one-time payments
5. **Invoice** - For subscription payments

## Security Considerations

### ✅ Implemented:
- Webhook signature verification
- Idempotency checks
- User authentication for all endpoints
- Firestore security rules (read-only for payment_history, subscriptions)
- Admin SDK for server-side writes

### ⚠️ Recommendations:
1. Add rate limiting to webhook endpoint (already has idempotency)
2. Monitor for suspicious webhook patterns
3. Add alerting for failed webhook processing
4. Regular audit of customer ID validity

## Error Handling

### Webhook Errors:
- **Signature verification failure**: Returns 400, logs error
- **Profile not found**: Returns 404, logs error
- **Stripe API errors**: Logs error, continues processing other events
- **Payment recording failure**: Non-critical, doesn't throw

### Customer Portal Errors:
- **Invalid customer ID**: Now validates and attempts recovery
- **Missing customer ID**: Suggests sync subscription
- **Stripe API errors**: Returns appropriate error message

## Testing Recommendations

1. **Test Scenarios**:
   - ✅ New monthly subscription
   - ✅ New yearly subscription
   - ✅ Subscription renewal
   - ✅ Payment failure
   - ✅ Refund
   - ✅ Cancellation
   - ✅ Customer ID validation
   - ✅ Invalid customer ID recovery

2. **Edge Cases to Test**:
   - Customer deleted in Stripe
   - Test/live mode mismatch
   - Webhook arrives before profile exists
   - Multiple webhooks for same event
   - Yearly plan expiration

## Monitoring & Alerts

### Key Metrics to Monitor:
1. Webhook processing success rate
2. Customer portal access failures
3. Invalid customer ID occurrences
4. Payment history recording failures
5. Subscription sync failures

### Recommended Alerts:
- High rate of invalid customer IDs
- Webhook processing failures
- Payment recording failures
- Subscription status mismatches

## Recommendations

### Immediate:
1. ✅ **DONE**: Add customer ID validation in customer portal
2. ✅ **DONE**: Fix yearly plan customer ID retrieval
3. ⚠️ **TODO**: Add `customer.deleted` webhook handler
4. ⚠️ **TODO**: Add environment check (test vs live) in webhook

### Short-term:
1. Add cron job to check expired yearly plans
2. Add monitoring/alerting for payment issues
3. Add customer ID cleanup job for invalid IDs
4. Add webhook retry mechanism for failed events

### Long-term:
1. Consider creating customer in checkout session for yearly plans
2. Add subscription status reconciliation job
3. Implement webhook event replay mechanism
4. Add payment analytics dashboard

## Code Quality Notes

### Strengths:
- Comprehensive webhook handling
- Idempotency protection
- Good error logging
- Fallback sync mechanism
- Security rules in place

### Areas for Improvement:
- More comprehensive error recovery
- Better test coverage for edge cases
- Webhook event replay capability
- Automated reconciliation jobs

