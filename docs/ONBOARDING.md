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

Get credentials from the team lead for:

```env
# Required for local development
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
GEMINI_API_KEY=

# Optional (payment features)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
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
pnpm dev          # Start development server
pnpm build        # Production build
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Check code style
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
| `lib/stores/interview-store.ts` | Interview state | ⭐⭐ |
| `lib/auth-context.tsx` | Authentication | ⭐⭐ |
| `lib/rag/` | RAG system | ⭐ |
| `lib/spaced-repetition/` | Learning algorithms | ⭐ |

---

## Engineering Domains

Each area can be owned by an engineer:

### 1. Interview Engine
**Files:** `components/interview/`, `app/api/chat/`, `app/api/execute/`

The core interview experience:
- AI chat with interviewer/partner modes
- Code editor (CodeMirror)
- Code execution and test validation
- Real-time feedback

**Key Technologies:** CodeMirror, Google Gemini, Piston API

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

### 4. User Dashboard
**Files:** `components/dashboard/`, `components/practice/`, `app/(pages)/`

User-facing features:
- Progress metrics
- Session history
- Practice mode
- Profile settings

**Key Technologies:** React, Zustand, Recharts

### 5. Platform & Infrastructure
**Files:** `lib/admin/`, `lib/rate-limiter.ts`, `app/api/webhook/`

Platform reliability:
- Authentication & RBAC
- Rate limiting & quotas
- Stripe integration
- Admin panel

**Key Technologies:** Firebase Admin, Stripe, Firestore

### 6. Growth & Engagement
**Files:** `lib/email/`, `lib/services/`, `app/api/cron/`

User retention:
- Email notifications
- Spaced repetition reminders
- Onboarding flows
- Analytics

**Key Technologies:** Brevo, Vercel Cron

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

- [ ] Local dev environment running
- [ ] Can log in with GitHub
- [ ] Read through key documentation
- [ ] Explore codebase for 2-3 hours
- [ ] Run tests successfully
- [ ] Make a small PR (typo fix, comment, etc.)
- [ ] Attend team sync meeting
- [ ] Identify domain of interest

---

## Useful Links

| Resource | URL |
|----------|-----|
| Vercel Dashboard | https://vercel.com/nikayel |
| Firebase Console | https://console.firebase.google.com |
| Stripe Dashboard | https://dashboard.stripe.com |
| Production Site | https://codesparring.com |

---

**Questions?** Ask in #engineering or reach out to your team lead!
