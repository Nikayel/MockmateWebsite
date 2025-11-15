import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"

// Promo codes stored server-side (not in git)
// These are only visible in the server-side API route, not in client code
const PROMO_CODES: Record<string, { discount: number; type: "percentage" | "free" }> = {
  "FREE25": { discount: 100, type: "free" }, // Free Pro plan
  // Add more promo codes here as needed
  // Format: "CODE": { discount: number, type: "free" | "percentage" }
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

    // Mark code as used (this will be done client-side with proper auth)
    // We'll return success and let client update profile
    
    // Apply promo code - upgrade user to Pro
    // Note: Profile update must be done client-side due to Firestore rules
    // The API validates the code, client updates the profile

    return NextResponse.json({ 
      valid: true,
      message: "Promo code validated! Upgrading your account...",
      discount_type: promoCode.type,
      userId: userId, // Return userId so client can update profile
    })
  } catch (error) {
    console.error("Promo code error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process promo code" },
      { status: 500 }
    )
  }
}

