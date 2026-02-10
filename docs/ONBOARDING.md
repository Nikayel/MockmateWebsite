# Engineering Onboarding Guide

Welcome to CodeSparring! This guide will help you get up and running quickly.

## Day 1: Setup & Orientation

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/Nikayel/MockmateWebsite.git
cd MockmateWebsite

# Install dependencies (we use pnpm)
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### 2. Environment Setup

Get credentials from the team lead for. See `.env.example` for the full list.

```env
# Required - AI & Firebase
GEMINI_API_KEY=                          # AI chat & embeddings
FIREBASE_ADMIN_PROJECT_ID=               # Firebase project
FIREBASE_ADMIN_CLIENT_EMAIL=             # Firebase service account
FIREBASE_ADMIN_PRIVATE_KEY=              # Firebase private key

# Required - Database
NEXT_PUBLIC_SUPABASE_URL=                # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=           # Supabase anon key

# Optional - Payments
STRIPE_SECRET_KEY=                       # Stripe API key
STRIPE_WEBHOOK_SECRET=                   # Stripe webhook signing

# Optional - RAG/Vector Search
PINECONE_API_KEY=                        # Vector database
OPENAI_API_KEY=                          # Fallback embeddings

# Optional - Voice Interviews
DEEPGRAM_API_KEY=                        # Speech-to-text (server-side only)

# Optional - Email & Rate Limiting
BREVO_API_KEY=                           # Email notifications
UPSTASH_REDIS_REST_URL=                  # Distributed rate limiting
UPSTASH_REDIS_REST_TOKEN=                # Upstash auth token

# Optional - Cron Jobs
CRON_SECRET=                             # Secure cron endpoints
```

### 3. Start Development

```bash
pnpm dev
```

Visit http://localhost:3000 - you should see the landing page!

### 4. Test Login

1. Click "Login" → Sign in with GitHub
2. Check Firebase Console → Authentication to verify user created
3. Check Firestore → `profiles` collection for your user document

---

## Week 1: Learn the Codebase

### Key Commands

```bash
pnpm dev          # Start development server (Turbopack - fast)
pnpm dev:webpack  # Start with Webpack (if Turbopack issues)
pnpm build        # Production build
pnpm build:analyze # Build with bundle analyzer
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report
pnpm lint         # Check code style (ESLint)
pnpm lint:fix     # Auto-fix lint issues
pnpm format       # Format code (Prettier)
pnpm format:check # Check formatting
pnpm typecheck    # Check TypeScript errors
```

### Recommended Reading Order

1. **README.md** - Project overview
2. **docs/ARCHITECTURE.md** - System design
3. **docs/API.md** - API reference
4. **docs/FIREBASE_STRUCTURE.md** - Database schema
5. **docs/TESTING_GUIDE.md** - How to write tests

### Key Files to Explore

| File | Purpose | Priority |
|------|---------|----------|
| `app/interview/page.tsx` | Main interview UI | ⭐⭐⭐ |
| `app/api/chat/route.ts` | AI chat endpoint | ⭐⭐⭐ |
| `app/api/execute/route.ts` | Code execution | ⭐⭐⭐ |
| `lib/types.ts` | TypeScript types | ⭐⭐⭐ |
| `lib/ai-providers.ts` | AI model integration | ⭐⭐⭐ |
| `lib/stores/interview-store.ts` | Interview state | ⭐⭐ |
| `lib/auth-context.tsx` | Authentication | ⭐⭐ |
| `lib/validations/` | Zod API schemas | ⭐⭐ |
| `lib/voice/` | Voice/speech-to-text | ⭐⭐ |
| `lib/prompts/` | AI prompt templates | ⭐⭐ |
| `lib/feedback/` | Session feedback system | ⭐⭐ |
| `lib/quota-enforcement.ts` | Usage quota system | ⭐ |
| `lib/rag/` | RAG system | ⭐ |
| `lib/spaced-repetition/` | Learning algorithms | ⭐ |

---

## Engineering Domains

Each area can be owned by an engineer:

### 1. Interview Engine
**Files:** `components/interview/`, `app/api/chat/`, `app/api/execute/`, `lib/prompts/`

The core interview experience:
- AI chat with interviewer/partner modes
- Code editor (CodeMirror 6)
- Code execution and test validation
- Real-time feedback with clarifying questions
- Session history and replay

**Key Technologies:** CodeMirror 6, Google Gemini, Piston API, React 19, Next.js 16

### 2. Learning System
**Files:** `lib/spaced-repetition/`, `components/roadmap/`, `app/api/spaced-repetition/`

Science-backed learning:
- FSRS & SM-2 algorithms
- Mastery scoring
- Study roadmaps
- Due problem scheduling

**Key Technologies:** FSRS algorithm, custom mastery calculation

### 3. AI/RAG Platform
**Files:** `lib/rag/`, `lib/agents/`, `app/api/rag/`

AI capabilities:
- Vector embeddings (Gemini/OpenAI)
- Knowledge retrieval
- Hint generation
- Smart recommendations

**Key Technologies:** Pinecone, Gemini embeddings, vector search

### 4. User Dashboard & Pages
**Files:** `components/dashboard/`, `components/practice/`, `app/dashboard/`, `app/sessions/`, `app/profile/`

User-facing features:
- Progress metrics and analytics
- Session history with detailed replay
- Practice mode with problem selection
- Profile settings and account management
- Blog (`app/blog/`) and Careers (`app/careers/`) pages
- Pricing and upgrade flows (`app/pricing/`, `app/upgrade/`)

**Key Technologies:** React 19, Zustand, Recharts, Framer Motion

### 5. Platform & Infrastructure
**Files:** `lib/admin/`, `lib/rate-limiter.ts`, `lib/quota-enforcement.ts`, `app/api/webhook/`

Platform reliability:
- Authentication & RBAC
- Rate limiting & quotas (Upstash Redis or Firestore)
- Stripe integration & subscription sync
- Admin panel with analytics
- Guest sessions (`lib/guest-session.ts`)
- Referral system (`lib/referrals.ts`)

**Key Technologies:** Firebase Admin, Stripe, Firestore, Upstash Redis

### 6. Growth & Engagement
**Files:** `lib/email/`, `lib/services/`, `app/api/cron/`

User retention:
- Email notifications
- Spaced repetition reminders
- Onboarding flows
- Analytics

**Key Technologies:** Brevo, Vercel Cron

### 7. Voice Mode
**Files:** `lib/voice/`, `components/interview/`

Spoken interview experience:
- Real-time speech-to-text transcription
- Voice-based problem discussion
- Deepgram integration for high accuracy
- Fallback to browser Web Speech API

**Key Technologies:** Deepgram, Web Speech API

---

## Code Conventions

### TypeScript

```typescript
// ✅ Use interfaces for object shapes
interface UserProfile {
  id: string
  email: string
  tier: 'free' | 'pro'
}

// ✅ Use type for unions/aliases
type SubscriptionTier = 'free' | 'pro' | 'enterprise'

// ❌ Avoid any
const user: any = {} // Bad
```

### React Components

```typescript
// ✅ Use function components with typed props
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}

// ✅ Use hooks for state
const [isLoading, setIsLoading] = useState(false)

// ✅ Use Zustand for shared state
const { user, setUser } = useAuthStore()
```

### API Routes

```typescript
// ✅ Standard pattern
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = await verifyAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate input
  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // 3. Business logic
  const data = await doSomething(result.data)

  // 4. Return response
  return NextResponse.json({ success: true, data })
}
```

### File Organization

```
components/
  feature/
    FeatureComponent.tsx    # Main component
    FeatureSubpart.tsx      # Sub-components
    index.ts                # Exports
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase + use | `useInterviewChat.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase | `UserTypes.ts` |
| API routes | kebab-case | `app/api/user-profile/route.ts` |

---

## Git Workflow

### Branch Naming

```
feature/add-voice-mode
fix/chat-timeout
refactor/interview-store
docs/update-readme
```

### Commit Messages

```bash
# Format: type(scope): message

feat(interview): add voice mode support
fix(chat): resolve timeout on long responses
refactor(store): simplify interview state
docs(api): add authentication examples
chore(deps): update dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with clear commits
3. Run `pnpm lint && pnpm typecheck && pnpm test`
4. Create PR with description
5. Request review
6. Merge after approval

---

## Debugging Tips

### Firebase Issues

```typescript
// Check if user is authenticated
import { auth } from '@/lib/firebase-client'
console.log('Current user:', auth.currentUser)

// Check token
const token = await auth.currentUser?.getIdToken()
console.log('Token:', token?.substring(0, 20) + '...')
```

### API Debugging

```typescript
// Add to any API route
console.log('Request body:', await request.json())
console.log('Auth header:', request.headers.get('authorization'))
```

### State Debugging

```typescript
// Zustand devtools - see state in browser
import { devtools } from 'zustand/middleware'

// In your store
export const useStore = create(
  devtools((set) => ({
    // ...
  }))
)
```

### Database Debugging

1. Firebase Console → Firestore → Data
2. Check document structure matches types
3. Verify security rules in `firestore.rules`

---

## Common Tasks

### Add a New API Endpoint

1. Create `app/api/my-endpoint/route.ts`
2. Add Zod schema in `lib/validations/api-schemas.ts`
3. Implement with auth + validation pattern
4. Add to API documentation
5. Write tests

### Add a New Component

1. Create in appropriate `components/` subdirectory
2. Type all props with interface
3. Export from index file
4. Use shadcn/ui primitives when possible

### Add a New Feature

1. Plan the data model (update `lib/types.ts`)
2. Create Firestore collection if needed
3. Add API endpoints
4. Build UI components
5. Connect with Zustand store if shared state needed
6. Write tests
7. Update documentation

---

## Getting Help

- **Slack:** #engineering channel
- **Code Questions:** Tag in PR or ask in Slack
- **Architecture Decisions:** Discuss with team lead
- **Bug Reports:** Create GitHub issue with reproduction steps

---

## First Week Checklist

- [ ] Local dev environment running (`pnpm dev`)
- [ ] Can log in with GitHub
- [ ] Read through key documentation (README, ARCHITECTURE, API)
- [ ] Explore codebase for 2-3 hours
- [ ] Run tests successfully (`pnpm test`)
- [ ] Run lint and typecheck (`pnpm lint && pnpm typecheck`)
- [ ] Try an interview session (both text and voice mode if enabled)
- [ ] Make a small PR (typo fix, comment, etc.)
- [ ] Attend team sync meeting
- [ ] Identify domain of interest from the 7 engineering domains

---

## Useful Links

| Resource | URL |
|----------|-----|
| Production Site | https://codesparring.com |
| Vercel Dashboard | https://vercel.com/nikayel |
| Firebase Console | https://console.firebase.google.com |
| Stripe Dashboard | https://dashboard.stripe.com |
| Pinecone Console | https://app.pinecone.io |
| Brevo Dashboard | https://app.brevo.com |
| Deepgram Console | https://console.deepgram.com |
| GitHub Repo | https://github.com/Nikayel/MockmateWebsite |

---

## Tech Stack Quick Reference

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| State | Zustand |
| Database | Firebase Firestore, Supabase |
| AI | Google Gemini, OpenAI (fallback) |
| Vectors | Pinecone |
| Payments | Stripe |
| Email | Brevo |
| Voice | Deepgram |
| Testing | Vitest, React Testing Library |

---

**Questions?** Ask in #engineering or reach out to your team lead!
