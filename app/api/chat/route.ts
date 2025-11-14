import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface UserContext {
  email?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, context, role, userContext } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Build user context string for personalized responses
    const userInfo = userContext as UserContext
    const userContextString = userInfo
      ? `
CANDIDATE INFORMATION:
- Email: ${userInfo.email || "Guest User"}
- Subscription: ${userInfo.subscription_tier || "free"} tier
- Sessions completed: ${userInfo.sessions_used || 0}
- Previous topics: ${userInfo.previous_topics?.join(", ") || "None"}
- Skill level: ${userInfo.skill_level || "Intermediate"}

Use this information to personalize your responses and questions appropriately.
`
      : ""

    // Define system prompts based on role with enhanced context awareness
    const systemPrompts = {
      interviewer: `You are a professional technical interviewer conducting a coding interview.
${userContextString}
Your responsibilities:
- Ask clarifying questions about the candidate's approach based on their skill level
- Guide them when they're stuck (without giving away the answer)
- Discuss time and space complexity
- Review code for bugs and optimizations
- Be encouraging but professional
- Focus on the Two Sum problem
- Reference their previous topics if relevant to build continuity
- Adjust difficulty based on their experience level

Keep responses concise and conversational, as if in a real interview.`,

      partner: `You are an AI coding assistant helping during a technical interview.
${userContextString}
Your responsibilities:
- Provide hints when the user is stuck, calibrated to their skill level
- Help debug code issues
- Suggest optimizations appropriate for their experience
- Answer questions about algorithms and data structures
- Be supportive and educational
- Focus on the Two Sum problem
- Remember their progress and build on previous conversations

Keep responses brief and actionable.`,
    }

    const systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Initialize the model with system instruction
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    })

    // Build conversation history for Gemini
    const history: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = []

    if (context && Array.isArray(context)) {
      context.forEach((msg: { type: string; message: string }) => {
        history.push({
          role: msg.type === "user" ? "user" : "model",
          parts: [{ text: msg.message }],
        })
      })
    }

    // Start chat with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    })

    // Send message and get response
    const result = await chat.sendMessage(message)
    const response = await result.response
    const reply = response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 },
    )
  }
}
