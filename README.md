<p align="center">
  <img src="public/logo-codesparring.svg" alt="CodeSparring Logo" width="300" />
</p>

<h1 align="center">CodeSparring</h1>

<p align="center">
  <strong>AI-Powered Coding Interview Practice Platform</strong>
</p>

<p align="center">
  <a href="https://codesparring.com">Live Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="docs/API.md">API Docs</a> •
  <a href="docs/ARCHITECTURE.md">Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
</p>

---

## What is CodeSparring?

CodeSparring helps developers prepare for technical interviews by simulating realistic coding interviews with an AI interviewer. Practice in your browser with real-time feedback, spaced repetition learning, and voice mode.

### Key Features

| Feature | Description |
|---------|-------------|
| **AI Interviewer** | Practice with an AI that asks clarifying questions, gives hints, and evaluates your approach |
| **Code Execution** | Write and run code in 7+ languages with instant test validation |
| **Spaced Repetition** | Never forget patterns with science-backed scheduling (FSRS algorithm) |
| **Voice Mode** | Talk through your solution like a real interview |
| **Smart Recommendations** | AI-powered suggestions based on your strengths and gaps |
| **Study Roadmaps** | Personalized learning paths for target companies |

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Radix UI, Framer Motion |
| **State Management** | Zustand |
| **Code Editor** | CodeMirror 6 |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth (GitHub/Google OAuth) |
| **AI** | Google Gemini 2.5 Flash |
| **Vector Search** | Pinecone / Firestore |
| **Payments** | Stripe |
| **Voice** | Deepgram |
| **Deployment** | Vercel |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Firebase project
- Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/Nikayel/MockmateWebsite.git
cd MockmateWebsite

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
pnpm dev
```

Visit http://localhost:3000

### Environment Variables

```env
# Required
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
GEMINI_API_KEY=your_gemini_key

# Optional (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

See `.env.example` for full configuration.

---

## Project Structure

```
MockmateWebsite/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (50+ endpoints)
│   ├── dashboard/            # User dashboard
│   ├── interview/            # Interview interface
│   ├── practice/             # Practice mode
│   └── admin/                # Admin panel
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── interview/            # Interview components
│   ├── dashboard/            # Dashboard components
│   └── ...
├── lib/                      # Core logic
│   ├── rag/                  # RAG system
│   ├── spaced-repetition/    # Learning algorithms
│   ├── stores/               # Zustand stores
│   └── types.ts              # TypeScript types
├── docs/                     # Documentation
│   ├── API.md                # API reference
│   ├── ARCHITECTURE.md       # System design
│   ├── ONBOARDING.md         # New engineer guide
│   └── ...
└── public/                   # Static assets
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/API.md) | Complete API documentation |
| [Architecture](docs/ARCHITECTURE.md) | System design & data flow |
| [Onboarding Guide](docs/ONBOARDING.md) | New engineer setup |
| [Firebase Structure](docs/FIREBASE_STRUCTURE.md) | Database schema |
| [Testing Guide](docs/TESTING_GUIDE.md) | How to write tests |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Security](SECURITY.md) | Security policy |

---

## Development

### Available Scripts

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Start production server
pnpm test         # Run tests
pnpm test:watch   # Tests in watch mode
pnpm test:coverage # Tests with coverage
pnpm lint         # Check code style
pnpm lint:fix     # Fix linting issues
pnpm typecheck    # TypeScript check
pnpm format       # Format code (Prettier)
```

### Code Quality

```bash
# Before committing
pnpm lint && pnpm typecheck && pnpm test
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CodeSparring                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)  │  Backend (API Routes)  │  Services   │
│  - React 19          │  - Chat API            │  - Gemini   │
│  - Zustand           │  - Execute API         │  - Firebase │
│  - CodeMirror        │  - User APIs           │  - Stripe   │
│  - shadcn/ui         │  - Admin APIs          │  - Piston   │
└─────────────────────────────────────────────────────────────┘
```

See [Architecture Documentation](docs/ARCHITECTURE.md) for detailed system design.

---

## API Highlights

### Interview Chat

```typescript
POST /api/chat
{
  "message": "How should I approach this?",
  "code": "function twoSum(nums, target) { }",
  "scenarioTitle": "Two Sum",
  "language": "javascript",
  "roleType": "interviewer"
}
```

### Code Execution

```typescript
POST /api/execute
{
  "code": "function twoSum(...) { ... }",
  "language": "javascript",
  "scenarioId": "two-sum"
}
```

See [API Documentation](docs/API.md) for all endpoints.

---

## Engineering Domains

The codebase is organized into clear ownership areas:

| Domain | Description | Key Files |
|--------|-------------|-----------|
| **Interview Engine** | Core interview experience | `components/interview/`, `app/api/chat/` |
| **Learning System** | Spaced repetition & roadmaps | `lib/spaced-repetition/`, `components/roadmap/` |
| **AI/RAG Platform** | Embeddings & retrieval | `lib/rag/`, `lib/agents/` |
| **User Dashboard** | Metrics & progress | `components/dashboard/`, `components/practice/` |
| **Platform & Infra** | Auth, billing, admin | `lib/admin/`, `app/api/webhook/` |
| **Growth** | Notifications & engagement | `lib/email/`, `app/api/cron/` |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push and create a Pull Request

---

## Security

See [SECURITY.md](SECURITY.md) for security policies and vulnerability reporting.

---

## License

Proprietary - All rights reserved.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Nikayel/MockmateWebsite/issues)
- **Email:** support@codesparring.com
- **Twitter:** [@codesparring](https://twitter.com/codesparring)

---

<p align="center">
  <strong>Built with ☕ and determination</strong>
</p>

<p align="center">
  <a href="https://codesparring.com">Website</a> •
  <a href="https://codesparring.com/blog">Blog</a> •
  <a href="https://codesparring.com/pricing">Pricing</a>
</p>
