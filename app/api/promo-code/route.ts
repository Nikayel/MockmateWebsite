import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase/auth"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

// Promo codes stored server-side (not in git)
const PROMO_CODES: Record<string, { discount: number; type: "percentage" | "free" }> = {
  "free25": { discount: 100, type: "free" }, // Free Pro plan
  // Add more promo codes here as needed
}

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json()

    if (!code || !userId) {
      return NextResponse.json({ error: "Code and userId are required" }, { status: 400 })
    }

    // Check if promo code exists
    const promoCode = PROMO_CODES[code.toUpperCase()]
    
    if (!promoCode) {
      return NextResponse.json({ 
        valid: false, 
        error: "Invalid promo code" 
      }, { status: 200 })
    }

    // Check if user already used this code (store in Firestore)
    const promoUsageRef = doc(db, "promo_code_usage", `${userId}_${code.toUpperCase()}`)
    const promoUsageSnap = await getDoc(promoUsageRef)

    if (promoUsageSnap.exists()) {
      return NextResponse.json({ 
        valid: false, 
        error: "This promo code has already been used" 
      }, { status: 200 })
    }

    // Mark code as used
    await setDoc(promoUsageRef, {
      user_id: userId,
      code: code.toUpperCase(),
      used_at: new Date().toISOString(),
      discount_type: promoCode.type,
    })

    // Apply promo code - upgrade user to Pro
    if (promoCode.type === "free") {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        subscription_tier: "pro",
        updated_at: new Date().toISOString(),
      }, { merge: true })
    }

    return NextResponse.json({ 
      valid: true,
      message: "Promo code applied successfully! You've been upgraded to Pro.",
      discount_type: promoCode.type,
    })
  } catch (error) {
    console.error("Promo code error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process promo code" },
      { status: 500 }
    )
  }
}

