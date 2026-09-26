import Stripe from "stripe"
import { logger } from "../../logger"
import type { PaymentProcessingCost } from "./types"

const STRIPE_DOMESTIC_CARD_RATE = 0.029
const STRIPE_DOMESTIC_FIXED_FEE = 0.3
const MAX_BALANCE_TRANSACTIONS = 1_000

export function domesticCardFee(chargeAmount: number): number {
  return chargeAmount * STRIPE_DOMESTIC_CARD_RATE + STRIPE_DOMESTIC_FIXED_FEE
}

export function summarizeMatchingFees(
  transactions: Array<{ amount: number; fee: number; currency: string }>,
  chargeAmount: number
): { averageFee: number; sampleSize: number } | null {
  const chargeCents = Math.round(chargeAmount * 100)
  const matches = transactions.filter(
    (transaction) => transaction.currency === "usd" && transaction.amount === chargeCents
  )
  if (matches.length === 0) return null

  return {
    averageFee:
      matches.reduce((total, transaction) => total + transaction.fee, 0) / 100 / matches.length,
    sampleSize: matches.length,
  }
}

export async function getPaymentProcessingCost(params: {
  chargeAmount: number
  startDate: Date
  endDate: Date
}): Promise<PaymentProcessingCost> {
  const domesticBaseline = domesticCardFee(params.chargeAmount)
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return {
      costPerSubscriber: domesticBaseline,
      domesticBaseline,
      sampleSize: 0,
      source: "stripe_domestic_estimate",
    }
  }

  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover" as Stripe.LatestApiVersion,
    })
    const transactions = await stripe.balanceTransactions
      .list({
        created: {
          gte: Math.floor(params.startDate.getTime() / 1_000),
          lte: Math.floor(params.endDate.getTime() / 1_000),
        },
        limit: 100,
        type: "charge",
      })
      .autoPagingToArray({ limit: MAX_BALANCE_TRANSACTIONS })

    const actual = summarizeMatchingFees(transactions, params.chargeAmount)
    return actual
      ? {
          costPerSubscriber: actual.averageFee,
          domesticBaseline,
          sampleSize: actual.sampleSize,
          source: "stripe_actual",
        }
      : {
          costPerSubscriber: domesticBaseline,
          domesticBaseline,
          sampleSize: 0,
          source: "stripe_domestic_estimate",
        }
  } catch (error) {
    logger.warn("[Unit Economics] Failed to read Stripe processing fees", { error })
    return {
      costPerSubscriber: domesticBaseline,
      domesticBaseline,
      sampleSize: 0,
      source: "stripe_domestic_estimate",
    }
  }
}
