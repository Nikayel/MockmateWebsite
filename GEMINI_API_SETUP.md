# Gemini API Integration & Demo Management

## Overview

This document describes the Gemini API integration and demo management system implemented for MockMate. The system provides context-aware AI personalities (interviewer and coding partner) with demo limitations to prevent abuse.

## Features Implemented

### 1. Google Gemini API Integration

**Replaced**: Anthropic Claude API
**New Provider**: Google Gemini (`@google/generative-ai`)
**Model**: `gemini-1.5-flash`

#### Key Benefits:
- Cost-effective AI interactions
- Fast response times
- Context-aware conversations
- Flexible system instructions

#### Implementation Details:

**File**: `/app/api/chat/route.ts`

The chat API now:
- Uses Google Gemini AI SDK
- Accepts user context for personalized responses
- Maintains conversation history
- Supports two distinct AI personalities

### 2. Context-Aware AI Personalities

Both AI personalities now have full awareness of user context:

#### User Context Includes:
- Email address
- Subscription tier (demo/free/pro)
- Number of sessions completed
- Previous topics practiced
- Estimated skill level

#### AI Interviewer
- Adjusts question difficulty based on skill level
- References previous topics for continuity
- Provides personalized guidance
- Maintains professional interview atmosphere

#### AI Coding Partner
- Calibrates hints to user experience
- Remembers progress across conversation
- Provides targeted optimization suggestions
- Adapts teaching style to skill level

### 3. Demo Limitation System

**Purpose**: Prevent users from accessing the demo multiple times without signing up

#### Implementation:

**File**: `/lib/demo-manager.ts`

**Methods Used**:
1. **Cookies**: Persistent storage (expires in 1 year)
2. **LocalStorage**: Backup method for demo tracking
3. **SessionStorage**: Temporary in-session tracking

#### Key Functions:

```typescript
// Check if user can access demo
checkDemoAccess(): DemoStatus

// Mark demo as used (called on "Start Interview")
markDemoAsUsed(): void

// Get user context for AI personalization
getUserContext(): UserContext

// Save user preferences
saveUserPreferences(email?, skillLevel?): void

// Clear demo restriction (for testing only)
clearDemoRestriction(): void
```

#### User Experience Flow:

1. **First Visit**: User can start the demo interview
2. **Start Interview**: Demo is marked as used via cookies + localStorage
3. **Subsequent Visits**: Dialog appears explaining demo was already used
4. **Conversion**: User is prompted to sign up for unlimited access

### 4. Demo Limitation Dialog

**File**: `/app/demo/page.tsx`

Shows when user tries to start demo after already using it:
- Clear explanation with date of previous use
- Benefits of signing up
- Call-to-action buttons (Sign Up / Maybe Later)
- Professional UI matching MockMate branding

## Setup Instructions

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000/demo`

## Testing Demo Limitation

### Test the Demo Flow:

1. **First Demo Access**:
   ```
   - Go to /demo
   - Click "Start Interview"
   - Verify interview starts successfully
   ```

2. **Check Demo Used**:
   ```
   - Open browser DevTools
   - Application > Cookies
   - Verify "mockmate_demo_used" cookie exists
   - Application > Local Storage
   - Verify "mockmate_demo_timestamp" key exists
   ```

3. **Try Second Access**:
   ```
   - Refresh the page
   - Click "Start Interview" again
   - Verify dialog appears blocking access
   ```

4. **Clear Demo for Testing**:
   ```javascript
   // Run in browser console
   import { clearDemoRestriction } from '@/lib/demo-manager'
   clearDemoRestriction()
   ```

   Or manually:
   ```javascript
   // Clear cookie
   document.cookie = "mockmate_demo_used=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
   // Clear storage
   localStorage.removeItem("mockmate_demo_timestamp")
   sessionStorage.removeItem("demo_in_progress")
   ```

## API Usage

### Chat Endpoint

**URL**: `POST /api/chat`

**Request Body**:
```json
{
  "message": "How should I approach this problem?",
  "context": [
    { "type": "user", "message": "Previous message" },
    { "type": "ai", "message": "Previous response" }
  ],
  "role": "interviewer",
  "userContext": {
    "email": "user@example.com",
    "subscription_tier": "demo",
    "sessions_used": 1,
    "previous_topics": ["Two Sum"],
    "skill_level": "Intermediate"
  }
}
```

**Response**:
```json
{
  "reply": "Let's start by discussing the time complexity constraints..."
}
```

### Context Management

**Getting User Context**:
```typescript
import { getUserContext } from '@/lib/demo-manager'

const userContext = getUserContext()
// Use in API calls for personalized responses
```

**Saving User Preferences**:
```typescript
import { saveUserPreferences } from '@/lib/demo-manager'

// Save email and skill level
saveUserPreferences('user@example.com', 'Advanced')
```

## File Structure

```
/app/api/chat/route.ts           # Gemini API integration
/lib/demo-manager.ts              # Demo limitation utilities
/app/demo/page.tsx                # Updated demo page with restrictions
/.env.example                     # Environment variable template
/.env.local                       # Local environment (gitignored)
/GEMINI_API_SETUP.md             # This documentation
```

## Security Considerations

### Demo Limitation Security:

**Current Implementation**:
- Cookie-based tracking (client-side)
- LocalStorage backup (client-side)
- Users can technically clear cookies to bypass

**Recommended Enhancements for Production**:

1. **Server-side tracking**:
   ```typescript
   // Track by IP address + user agent
   // Store in database or Redis cache
   ```

2. **Fingerprinting**:
   ```typescript
   // Use browser fingerprinting library
   // Combine with IP tracking
   ```

3. **Account requirement**:
   ```typescript
   // Require email verification before demo
   // Track demos per email in database
   ```

### API Key Security:

- **Never commit** `.env.local` to version control
- Use environment variables in production
- Rotate API keys periodically
- Monitor Gemini API usage for abuse

## Cost Management

### Gemini Pricing (as of 2024):

**Gemini 1.5 Flash**:
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Very cost-effective for chat applications

### Estimated Costs:

**Per Demo Session** (average):
- ~50 messages exchanged
- ~500 tokens per message
- Total: ~25,000 tokens
- Cost: ~$0.01 per demo

**Monthly** (1000 demos):
- Estimated: $10-15/month

### Cost Optimization:

1. **Token Limits**: Set `maxOutputTokens: 1024` (already implemented)
2. **Context Pruning**: Limit conversation history length
3. **Demo Restriction**: One demo per user (already implemented)
4. **Rate Limiting**: Add rate limits to API endpoint

## Troubleshooting

### Common Issues:

**1. "API key not valid" error**:
```
Solution: Verify GEMINI_API_KEY in .env.local
Check: https://makersuite.google.com/app/apikey
```

**2. Demo restriction not working**:
```
Solution: Check browser allows cookies
Verify: DevTools > Application > Cookies
```

**3. AI responses not personalized**:
```
Solution: Verify userContext is passed to API
Check: Network tab > /api/chat > Request payload
```

**4. Build errors with Gemini SDK**:
```
Solution: npm install @google/generative-ai --legacy-peer-deps
Clean: rm -rf node_modules && npm install
```

## Next Steps

### Recommended Enhancements:

1. **Server-side Demo Tracking**:
   - Track by IP + user agent in database
   - More robust than client-side only

2. **User Skill Assessment**:
   - Add onboarding quiz to determine skill level
   - Save to userContext for better AI personalization

3. **Progress Persistence**:
   - Save demo progress to localStorage
   - Allow users to resume if interrupted

4. **Analytics**:
   - Track demo completion rates
   - Monitor AI response quality
   - Measure conversion to sign-up

5. **A/B Testing**:
   - Test different AI personalities
   - Optimize system prompts
   - Measure user engagement

## Support

For issues or questions:
- Check this documentation
- Review `.env.example` for configuration
- Test with `clearDemoRestriction()` for debugging
- Verify API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

---

**Last Updated**: 2024-11-14
**Version**: 1.0.0
**Dependencies**: `@google/generative-ai` v0.21.0+
