# Tech Stack

## Application

- Framework: Next.js 16 with the App Router.
- UI runtime: React 19.
- Language: TypeScript 5.
- Styling: Tailwind CSS 4.
- Components: shadcn/ui and Radix UI primitives.
- Motion: Framer Motion.
- Client state: Zustand where shared client state is needed.

## Interview Experience

- Code editor: CodeMirror 6.
- Code execution: Piston through `lib/piston.ts`.
- Supported editor languages include JavaScript, Python, Java, C++, Go, and Rust.
- Markdown and math rendering: React Markdown, remark/rehype plugins, and KaTeX.

## AI and Learning

- Primary LLM provider: Google Gemini via `@google/generative-ai`.
- Provider abstractions: `lib/ai-providers.ts` and `lib/ai-providers-edge.ts`.
- RAG and vector workflows: `lib/rag/`.
- Vector search: Pinecone and Firestore-backed retrieval paths.
- Spaced repetition: FSRS and SM-2 style algorithms under `lib/spaced-repetition/`.

## Data, Auth, and Backend

- Database: Firebase Firestore.
- Authentication: Firebase Auth with OAuth providers.
- Server SDK: Firebase Admin.
- API layer: Next.js route handlers under `app/api/`.
- Validation: Zod and local API schema helpers.
- Email: Brevo through `lib/email/`.

## Payments, Analytics, and Infrastructure

- Payments: Stripe checkout, webhooks, and billing portal flows.
- Analytics: Vercel Analytics, Vercel Speed Insights, and Google/Firebase analytics utilities where configured.
- Hosting: Vercel.
- Scheduled work: Vercel cron and project scripts.
- Package manager: pnpm.

## Quality Tooling

- Linting: ESLint.
- Formatting: Prettier with Tailwind plugin.
- Testing: Vitest.
- Type checking: `tsc --noEmit`.
- Recommended checks: `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
