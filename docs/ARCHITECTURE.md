# MockMate Architecture

How the website and extension work together.

## Overview

MockMate consists of two main components:
1. **Website** - Marketing, authentication, and user management
2. **VS Code Extension** - The actual interview experience

Both connect through a shared Supabase backend.

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   VS Code       │         │    Website       │
│   Extension     │         │   (Next.js)      │
└────────┬────────┘         └────────┬─────────┘
         │                            │
         │                            │
         └────────────┬───────────────┘
                      │
                      │
              ┌───────▼────────┐
              │   Supabase     │
              │                │
              │  - Auth        │
              │  - Database    │
              │  - Edge Funcs  │
              └────────────────┘
```

## Authentication Flow

1. User clicks "Sign In" in extension
2. Extension opens website `/login` page
3. Website initiates GitHub OAuth via Supabase
4. After auth, website generates deep link: `vscode://nikayel.MockMate/auth-callback?token=<jwt>`
5. Extension receives token and stores it securely
6. Extension uses token for all API calls

## Database Schema

### profiles table

Stores user subscription and usage data:

```sql
- id (uuid, primary key)
- subscription_tier (text: 'free' | 'pro')
- simulations_used (integer)
- usage_reset_date (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

### interview_sessions table

Tracks interview sessions:

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- scenario_type (text)
- started_at (timestamp)
- ended_at (timestamp)
- status (text)
```

## API Flow

### Extension → Supabase Edge Functions

1. **usage-gate** - Check if user can start a session
   - Validates subscription tier
   - Checks usage limits
   - Increments usage counter

2. **chat-proxy** - Proxy LLM API calls
   - Routes to OpenAI or Gemini
   - Handles streaming
   - Manages API keys securely

3. **session-start** - Initialize new session
   - Creates session record
   - Sets up tracking

4. **session-event** - Log events during session
   - Messages, code changes, etc.

5. **session-finalize** - Complete session
   - Updates session status
   - Generates summary

6. **upgrade-tier** - Upgrade subscription
   - Updates profiles.subscription_tier
   - Called after payment

### Website → Supabase

- Direct database queries via Supabase client
- Reads user profiles
- Updates subscription status (after payment)

## Payment Flow

1. User clicks "Upgrade" on website
2. Payment processed (Stripe/PayPal) - TODO
3. On success, call `upgrade-tier` Edge Function
4. Update `profiles.subscription_tier = 'pro'`
5. Extension immediately sees new tier on next check

## Workspace Context

The extension reads workspace files and sends them to AI:

1. User selects folders/files
2. Extension reads file contents
3. Sends to Edge Functions with chat requests
4. AI uses context for better responses

## Security

- API keys stored in Supabase Edge Functions (never exposed)
- JWT tokens for authentication
- Row-level security in Supabase
- HTTPS for all connections

## Deployment

- **Website**: Vercel (automatic from GitHub)
- **Extension**: VS Code Marketplace
- **Backend**: Supabase (hosted)

## Environment Variables

### Website (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

### Supabase Edge Functions
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_API_KEY`
- `OPENAI_API_KEY` (optional)

### Extension (VS Code Settings)
- `mockmate.supabaseUrl`
- `mockmate.supabaseAnonKey`
- `mockmate.websiteUrl`

