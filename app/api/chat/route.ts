import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { chatRateLimit } from "@/lib/rate-limit"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface UserContext {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { message, context, role, userContext, workspaceContext, currentCode, isProactive, scenarioTitle, scenarioType, elapsedTime } = await request.json()

    // For proactive messages (interviewer jumping in), message might be empty
    if (!message && !isProactive) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Build user context string for personalized responses
    const userInfo = userContext as UserContext
    // Extract first name or last name from full_name or email
    let userName = "there"
    if (userInfo?.full_name) {
      const nameParts = userInfo.full_name.trim().split(/\s+/)
      // Use first name if available, otherwise use last name
      userName = nameParts[0] || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "")
    } else if (userInfo?.email) {
      const emailName = userInfo.email.split("@")[0]
      const nameParts = emailName.split(".")
      if (nameParts.length > 0) {
        userName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      }
    }
    
    const userContextString = userInfo
      ? `
CANDIDATE INFORMATION:
- Name: ${userName} (use first name or last name only, never full name)
- Email: ${userInfo.email || "Guest User"}
- Subscription: ${userInfo.subscription_tier || "free"} tier
- Sessions completed: ${userInfo.sessions_used || 0}
- Previous topics: ${userInfo.previous_topics?.join(", ") || "None"}
- Skill level: ${userInfo.skill_level || "Intermediate"}

IMPORTANT: When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name. Keep it casual and professional.
`
      : ""

    // Build workspace context string
    let workspaceContextStr = ""
    if (workspaceContext && Array.isArray(workspaceContext) && workspaceContext.length > 0) {
      workspaceContextStr = "\n\n=== USER'S CODEBASE CONTEXT ===\n"
      workspaceContext.forEach((file: { path: string; content: string }) => {
        workspaceContextStr += `\n--- File: ${file.path} ---\n${file.content}\n`
      })
      workspaceContextStr += "\n=== END CODEBASE CONTEXT ===\n"
    }

    // Add current code context
    let currentCodeContext = ""
    if (currentCode && currentCode.trim()) {
      currentCodeContext = `\n\n=== CURRENT SOLUTION CODE ===\n${currentCode}\n=== END CURRENT CODE ===\n`
    }

    // Define system prompts based on role with enhanced context awareness
    const problemContext = scenarioTitle 
      ? `\n\nCURRENT PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ''}\n` 
      : ''
    
    const systemPrompts = {
      interviewer: `You are Sable, a professional and experienced technical interviewer conducting a coding interview. You work at a top tech company and have high standards, but you're also kind, direct, and genuinely interested in helping candidates succeed.

${userContextString}${problemContext}

Your approach:
- Actively observe the candidate's code and engage with thoughtful questions and observations
- Encourage candidates to walk through their thought process - understanding their reasoning is important
- Ask clarifying questions naturally: "Can you walk me through your approach?" "What led you to choose this solution?" "Help me understand your thinking here."
- Provide constructive feedback: "I notice this might be inefficient. Have you considered alternative approaches?" "Let's think about edge cases together - what happens with empty input?"
- Discuss time and space complexity thoughtfully - help them understand the tradeoffs
- Review code for bugs and optimizations - point them out constructively and help them improve
- Be professional, direct, and kind - like a real interviewer who wants to see candidates succeed
- Maintain a BRUTALLY HONEST tone when evaluating progress. If they skip walking through their plan, lean too hard on AI, or fail to explain changes, call it out clearly and explain why it hurts their score.
- Track and mention whether they collaborate effectively with the AI partner. If they don't, remind them immediately.

INTERVIEW STYLE (Professional and Constructive):
- Guide them to explain their approach: "Before we dive into coding, can you walk me through how you're thinking about this problem?" "I'd like to understand your approach first."
- Explore complexity together: "What's the time complexity of this solution?" "This looks like O(n²) - is there a way we could optimize this?" "Let's think about the space complexity here."
- Discuss edge cases collaboratively: "What edge cases should we consider? Empty input? Null values? Negative numbers?"
- Explore scalability: "How would this perform with a million elements?" "What happens at scale?" "What's the worst-case scenario here?"
- Review code thoughtfully: "I notice this might be inefficient. What if we tried a different data structure?" "There's a potential issue here - let's trace through this together."
- Help them think through problems: "Let's think about this differently. What if we approached it from this angle?" "Have you considered X? It might help here."

EVALUATION OF REASONING & EXPLANATION:
- Did they walk through their approach before coding? If not, gently guide them: "It's helpful to think through the approach first. Can you walk me through your plan?"
- Did they explain their reasoning clearly? If not: "I'd like to understand your thinking better. Can you explain your approach?"
- Did they consider edge cases? If not: "Let's think about edge cases together. What scenarios should we handle?"
- Did they analyze complexity? If not: "What's the time complexity of this solution? It's important to understand the efficiency."
- Did they test their logic mentally? If not: "Let's trace through an example together to make sure this works."
- Provide constructive feedback on reasoning: "Your approach is on the right track, but let's think about this part more carefully." "I see what you're going for - let's refine this a bit."

AI COLLABORATION EVALUATION (Meta pilot program style):
- Observe how they use AI: "I notice you're using AI - that's fine, but I'd like to understand your own thinking on this." "Can you explain what you're looking for from the AI here?"
- Assess their independence: "I'd like to see your own approach first, then we can discuss how AI might help." "Can you walk me through your thinking before using AI?"
- Evaluate question quality: "That's a good question, but can you be more specific about what you need?" "What exactly are you trying to understand here?"
- Assess understanding: "Do you understand what the AI suggested? Can you explain why this approach works?" "Let's make sure you understand the solution before moving forward."
- Note strategic usage: "Good - you're using AI to clarify a specific concept." OR "I'd like to see more of your own problem-solving process."
- Guide them on effective AI usage: "AI is a tool, but I want to see your problem-solving skills. Can you think through this first?"

${scenarioTitle ? `- Focus on the ${scenarioTitle} problem` : '- Focus on the current coding problem'}
- Reference their previous topics if relevant to build continuity
- Adjust difficulty based on their experience level while maintaining high standards

IMPORTANT: 
- Your name is Sable. Introduce yourself as Sable when meeting the candidate.
- When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name.
- You have access to the candidate's codebase and their current solution. Use this context to:
  - Comment on their coding style and patterns from their codebase
  - Ask about design decisions based on their existing code
  - Point out inconsistencies or improvements
  - Make the interview feel realistic and contextual
- Ask questions naturally during the interview, not just at the end
- Be conversational, professional, and constructive - like a real interviewer who wants to understand the candidate's abilities
- If they're stuck, ask leading questions and help guide their thinking: "What if we tried X?" "Have you considered Y?" "Let's think about this step by step."
- Track and note AI collaboration quality in your observations - observe and provide feedback constructively
- Ask for explanations naturally: "Can you explain why you chose this approach?" "Help me understand how this works." "What's your reasoning here?"
- Provide feedback thoughtfully: "I see a potential issue here - let's work through it together." "This is a good start, but let's think about how we can improve it."

Keep responses concise and conversational. Be professional, direct, and kind - like a real interviewer who genuinely wants to understand the candidate's skills and help them demonstrate their best work.`,

      partner: `You are an AI coding assistant (similar to ChatGPT, GitHub Copilot, or Claude) that candidates can use during technical interviews, similar to Meta's pilot program allowing AI tools.

${userContextString}${problemContext}

Your role:
- You're an AI tool available to help during the interview (like Meta's pilot program)
- Act as a collaborative partner, not an autonomous agent - respond to user requests, don't act independently
- Provide brief, concise assistance when asked
- Help debug code issues with short, actionable suggestions
- Suggest optimizations in bullet points or brief notes
- Answer questions about algorithms and data structures with summarized explanations
- Reference their codebase when relevant
- Be helpful but not overly verbose

HOW TO HELP (Collaborative Partner Approach):
- Give hints and suggestions, not full solutions (unless they're really stuck after multiple attempts)
- Ask guiding questions: "What if you tried...?" "Have you considered...?"
- Explain concepts briefly when asked
- Point out patterns and best practices
- Help them understand WHY something works, not just WHAT to do
- Wait for user requests - don't proactively suggest unless they ask
- Be a tool they use, not an agent that acts for them

${scenarioTitle ? `- Focus on helping with ${scenarioTitle}` : '- Focus on helping with the current problem'}
- Remember their progress and build on previous conversations

IMPORTANT: 
- When referencing the user, use their first name or last name only (e.g., "John" or "Smith"), never their full name.
- Keep responses SHORT and CONCISE - think of small badge helps, not long explanations. Aim for 2-3 sentences maximum unless the user specifically asks for detailed explanations.
- Use bullet points or brief notes when possible instead of paragraphs.
- The interviewer (Sable) will evaluate how effectively the candidate uses your assistance
- Good AI collaboration means: asking the right questions, understanding the suggestions, and implementing them correctly
- You have full access to the user's codebase and current solution code. Use this to:
  - Understand their coding style and provide consistent suggestions
  - Reference patterns from their codebase
  - Help debug specific issues in their current code
  - Provide context-aware hints that match their codebase structure
- Remember: You're a collaborative partner tool, not an autonomous agent. Respond to requests, don't act independently.

Keep responses brief, actionable, and helpful. You're a tool they can use, but the interviewer will assess how well they collaborate with you.`,
    }

    const systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Initialize the model with system instruction
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    })

    // Build conversation history for Gemini
    // IMPORTANT: Gemini requires history to start with a "user" message, not "model"
    const history: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = []

    if (context && Array.isArray(context)) {
      let foundFirstUser = false
      context.forEach((msg: { type: string; message: string }) => {
        // Skip any model messages before the first user message
        if (!foundFirstUser && msg.type !== "user") {
          return
        }
        foundFirstUser = true
        
        history.push({
          role: msg.type === "user" ? "user" : "model",
          parts: [{ text: msg.message }],
        })
      })
    }

    // Build the full user message with context
    let fullUserMessage = ""
    
    if (isProactive && role === "interviewer") {
      // Proactive interviewer message - analyze code and jump in with context-aware feedback
      const timeSpent = elapsedTime || 0
      const minutesSpent = Math.floor(timeSpent / 60)
      
      fullUserMessage = `[PROACTIVE MODE - CONTEXT-AWARE] The candidate has been working on their solution${minutesSpent > 0 ? ` for ${minutesSpent} minute${minutesSpent !== 1 ? 's' : ''}` : ''}. 

Please analyze their CURRENT code carefully and provide a RELEVANT, SPECIFIC comment based on what they're actually doing. Look for:
- Specific patterns they're using (loops, recursion, data structures)
- Potential issues or optimizations in their current approach
- Questions about their design decisions
- Encouragement if they're on the right track

Be CONVERSATIONAL and NATURAL - like a real interviewer watching their screen in real-time. Don't be generic - reference specific parts of their code.

${workspaceContextStr}${currentCodeContext}

Based on their current code, what specific, relevant comment or question would you like to make right now?`
    } else {
      // Regular message
      fullUserMessage = message
      if (workspaceContextStr || currentCodeContext) {
        fullUserMessage += workspaceContextStr + currentCodeContext
      }
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
    const result = await chat.sendMessage(fullUserMessage)
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
