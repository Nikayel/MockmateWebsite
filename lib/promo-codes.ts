/**
 * Promo Codes Database Service
 *
 * Manages promo codes in Firestore instead of hardcoded values.
 * Benefits:
 * - Marketing can create/expire promos without deployments
 * - Usage tracking and limits
 * - Audit trail
 */

import { adminDb } from './firebase-admin'

export interface PromoCode {
  code: string                          // Unique code (uppercase)
  discount_type: 'percentage' | 'free'  // Type of discount
  discount_amount: number               // Percentage (1-100) or months free

  // Limits
  max_uses: number | null               // null = unlimited
  current_uses: number                  // Current usage count
  max_uses_per_user: number             // Usually 1

  // Validity
  is_active: boolean
  valid_from: string                    // ISO date
  valid_until: string | null            // ISO date, null = no expiry

  // Targeting
  allowed_plans: ('monthly' | 'yearly')[] | null  // null = all plans
  new_users_only: boolean               // Only for users without prior subscription

  // Metadata
  description: string
  created_by: string                    // Admin user ID
  created_at: string
  updated_at: string
}

export interface PromoCodeUsage {
  user_id: string
  code: string
  applied_at: string
  discount_type: 'percentage' | 'free'
  discount_amount: number
  order_id?: string                     // Stripe checkout session if applicable
}

/**
 * Get a promo code from the database
 */
export async function getPromoCode(code: string): Promise<PromoCode | null> {
  const normalizedCode = code.toUpperCase().trim()

  const doc = await adminDb.collection('promo_codes').doc(normalizedCode).get()

  if (!doc.exists) {
    return null
  }

  return doc.data() as PromoCode
}

/**
 * Validate a promo code for a specific user
 */
export async function validatePromoCode(
  code: string,
  userId: string,
  options: {
    planType?: 'monthly' | 'yearly'
    isNewUser?: boolean
  } = {}
): Promise<{
  valid: boolean
  error?: string
  promoCode?: PromoCode
}> {
  const normalizedCode = code.toUpperCase().trim()
  const promoCode = await getPromoCode(normalizedCode)

  if (!promoCode) {
    return { valid: false, error: 'Invalid promo code' }
  }

  // Check if active
  if (!promoCode.is_active) {
    return { valid: false, error: 'This promo code is no longer active' }
  }

  // Check validity dates
  const now = new Date()
  const validFrom = new Date(promoCode.valid_from)
  const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null

  if (now < validFrom) {
    return { valid: false, error: 'This promo code is not yet active' }
  }

  if (validUntil && now > validUntil) {
    return { valid: false, error: 'This promo code has expired' }
  }

  // Check max uses
  if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
    return { valid: false, error: 'This promo code has reached its usage limit' }
  }

  // Check per-user limit
  const usageDoc = await adminDb
    .collection('promo_code_usage')
    .doc(`${userId}_${normalizedCode}`)
    .get()

  if (usageDoc.exists) {
    return { valid: false, error: 'You have already used this promo code' }
  }

  // Check plan type
  if (promoCode.allowed_plans !== null && options.planType) {
    if (!promoCode.allowed_plans.includes(options.planType)) {
      return {
        valid: false,
        error: `This promo code is not valid for ${options.planType} plans`
      }
    }
  }

  // Check new user requirement
  if (promoCode.new_users_only && options.isNewUser === false) {
    return { valid: false, error: 'This promo code is only for new users' }
  }

  return { valid: true, promoCode }
}

/**
 * Apply a promo code (increment usage, record usage)
 * Should be called after successful checkout/application
 */
export async function applyPromoCode(
  code: string,
  userId: string,
  orderId?: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = code.toUpperCase().trim()

  return await adminDb.runTransaction(async (transaction) => {
    const codeRef = adminDb.collection('promo_codes').doc(normalizedCode)
    const usageRef = adminDb.collection('promo_code_usage').doc(`${userId}_${normalizedCode}`)

    const [codeDoc, usageDoc] = await Promise.all([
      transaction.get(codeRef),
      transaction.get(usageRef),
    ])

    if (!codeDoc.exists) {
      return { success: false, error: 'Promo code not found' }
    }

    if (usageDoc.exists) {
      return { success: false, error: 'Promo code already used' }
    }

    const promoCode = codeDoc.data() as PromoCode

    // Check max uses
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      return { success: false, error: 'Promo code limit reached' }
    }

    const now = new Date().toISOString()

    // Increment usage count
    transaction.update(codeRef, {
      current_uses: promoCode.current_uses + 1,
      updated_at: now,
    })

    // Record usage
    const usage: PromoCodeUsage = {
      user_id: userId,
      code: normalizedCode,
      applied_at: now,
      discount_type: promoCode.discount_type,
      discount_amount: promoCode.discount_amount,
      order_id: orderId,
    }

    transaction.set(usageRef, usage)

    return { success: true }
  })
}

/**
 * Create a new promo code (admin function)
 */
export async function createPromoCode(
  data: Omit<PromoCode, 'current_uses' | 'created_at' | 'updated_at' | 'created_by'>,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = data.code.toUpperCase().trim()

  // Check if already exists
  const existing = await getPromoCode(normalizedCode)
  if (existing) {
    return { success: false, error: 'Promo code already exists' }
  }

  const now = new Date().toISOString()

  const promoCode: PromoCode = {
    ...data,
    code: normalizedCode,
    current_uses: 0,
    created_by: adminUserId,
    created_at: now,
    updated_at: now,
  }

  await adminDb.collection('promo_codes').doc(normalizedCode).set(promoCode)

  return { success: true }
}

/**
 * Deactivate a promo code
 */
export async function deactivatePromoCode(code: string): Promise<void> {
  const normalizedCode = code.toUpperCase().trim()

  await adminDb.collection('promo_codes').doc(normalizedCode).update({
    is_active: false,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Get promo code statistics
 */
export async function getPromoCodeStats(code: string): Promise<{
  totalUses: number
  uniqueUsers: number
  recentUses: PromoCodeUsage[]
} | null> {
  const normalizedCode = code.toUpperCase().trim()

  const promoCode = await getPromoCode(normalizedCode)
  if (!promoCode) {
    return null
  }

  // Get recent usage
  const usageSnap = await adminDb
    .collection('promo_code_usage')
    .where('code', '==', normalizedCode)
    .orderBy('applied_at', 'desc')
    .limit(20)
    .get()

  const recentUses = usageSnap.docs.map(doc => doc.data() as PromoCodeUsage)

  return {
    totalUses: promoCode.current_uses,
    uniqueUsers: recentUses.length, // Simplified - each usage is unique per user
    recentUses,
  }
}

/**
 * Seed initial promo codes (for migration from hardcoded values)
 * Call this once during deployment to migrate existing codes
 */
export async function seedInitialPromoCodes(adminUserId: string): Promise<void> {
  const initialCodes: Array<Omit<PromoCode, 'current_uses' | 'created_at' | 'updated_at' | 'created_by'>> = [
    {
      code: 'FREE25',
      discount_type: 'free',
      discount_amount: 12, // 12 months free
      max_uses: null,
      max_uses_per_user: 1,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: null,
      allowed_plans: null,
      new_users_only: false,
      description: 'Free Pro plan for 1 year',
    },
  ]

  for (const code of initialCodes) {
    const existing = await getPromoCode(code.code)
    if (!existing) {
      await createPromoCode(code, adminUserId)
    }
  }
}
