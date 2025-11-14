import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

export async function POST(request: NextRequest) {
  try {
    const { message, context, role } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Define system prompts based on role
    const systemPrompts = {
      interviewer: `You are a professional technical interviewer conducting a coding interview. You should:
- Ask clarifying questions about the candidate's approach
- Guide them when they're stuck (without giving away the answer)
- Discuss time and space complexity
- Review code for bugs and optimizations
- Be encouraging but professional
- Focus on the Two Sum problem

Keep responses concise and conversational, as if in a real interview.`,

      partner: `You are an AI coding assistant helping during a technical interview. You should:
- Provide hints when the user is stuck
- Help debug code issues
- Suggest optimizations
- Answer questions about algorithms and data structures
- Be supportive and educational
- Focus on the Two Sum problem

Keep responses brief and actionable.`,
    }

    const systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Build conversation history
    const messages: Anthropic.MessageParam[] = []

    if (context && Array.isArray(context)) {
      context.forEach((msg: { type: string; message: string }) => {
        messages.push({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.message,
        })
      })
    }

    // Add current message
    messages.push({
      role: "user",
      content: message,
    })

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    const textContent = response.content.find((block) => block.type === "text")
    const reply = textContent && textContent.type === "text" ? textContent.text : "I'm here to help!"

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 },
    )
  }
}
