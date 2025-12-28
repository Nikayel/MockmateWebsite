```
   ____          _      ____                       _
  / ___|___   __| | ___/ ___| _ __   __ _ _ __ _ __(_)_ __   __ _
 | |   / _ \ / _` |/ _ \___ \| '_ \ / _` | '__| '__| | '_ \ / _` |
 | |__| (_) | (_| |  __/___) | |_) | (_| | |  | |  | | | | | (_| |
  \____\___/ \__,_|\___|____/| .__/ \__,_|_|  |_|  |_|_| |_|\__, |
                             |_|                           |___/
```

<div align="center">

**AI-Powered Coding Interview Practice Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20DB-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)

[Live Demo](https://codesparring.com) • [Documentation](https://codesparring.com/docs) • [Blog](https://codesparring.com/blog)

</div>

---

## What is CodeSparring?

CodeSparring helps developers prepare for technical interviews by simulating realistic coding interviews with an AI interviewer. Practice in your browser with real-time feedback and comprehensive performance analytics.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   "Finally, a platform that feels like a real interview,           │
│    not just another LeetCode clone."                               │
│                                                                     │
│                                    — Software Engineer @ Google     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│   AI Interviewer   │  │  Spaced Repetition │  │   Voice Practice   │
│                    │  │                    │  │                    │
│  Natural dialogue  │  │  Science-backed    │  │  Talk through      │
│  Contextual hints  │  │  retention system  │  │  solutions like    │
│  Real feedback     │  │  Never forget      │  │  a real interview  │
└────────────────────┘  └────────────────────┘  └────────────────────┘

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│   Live Coding      │  │   Analytics        │  │   Pattern-Based    │
│                    │  │                    │  │                    │
│  Monaco editor     │  │  Track progress    │  │  15 DSA patterns   │
│  Code execution    │  │  Identify gaps     │  │  organized by      │
│  Syntax highlight  │  │  Performance data  │  │  interview freq    │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

## Architecture

```
                              ┌──────────────────────────────────────┐
                              │           CodeSparring               │
                              │         Architecture                 │
                              └──────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
           ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
           │   Frontend    │        │   Backend     │        │   Services    │
           │   (Next.js)   │        │   (API)       │        │   (External)  │
           └───────────────┘        └───────────────┘        └───────────────┘
                    │                         │                         │
        ┌───────────┴───────────┐    ┌───────┴───────┐    ┌────────────┴────────────┐
        │                       │    │               │    │                         │
        ▼                       ▼    ▼               ▼    ▼                         ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  App Router   │    │   React 19    │    │  API Routes   │    │   Firebase    │
│  Pages/Blog   │    │  Components   │    │  /api/*       │    │  Auth + DB    │
└───────────────┘    └───────────────┘    └───────────────┘    └───────────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                              ▼                   ▼                   ▼
                     ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
                     │  Google       │   │   Stripe      │   │   Deepgram    │
                     │  Gemini AI    │   │   Payments    │   │   Voice AI    │
                     └───────────────┘   └───────────────┘   └───────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 | React framework with App Router |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS 4 | Utility-first styling |
| **Auth & DB** | Firebase | Authentication + Firestore |
| **AI** | Google Gemini | AI interviewer & feedback |
| **Voice** | Deepgram | Speech-to-text for voice mode |
| **Payments** | Stripe | Subscription management |
| **Editor** | Monaco/CodeMirror | Code editing |
| **Vectors** | Pinecone | RAG for contextual hints |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Nikayel/MockmateWebsite.git
cd MockmateWebsite

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## Environment Variables

```env
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Configuration (Required)
GEMINI_API_KEY=your_gemini_api_key

# Stripe Configuration (Optional - for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Project Structure

```
MockmateWebsite/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── chat/                 # AI interviewer
│   │   ├── execute/              # Code execution
│   │   └── generate-feedback/    # Performance analysis
│   ├── blog/                     # Blog (MDX-based)
│   ├── docs/                     # Documentation
│   ├── interview/                # Live practice
│   ├── pricing/                  # Pricing page
│   └── dashboard/                # User dashboard
├── components/                   # React components
│   ├── blog/                     # Blog components
│   ├── seo/                      # SEO (JSON-LD, meta)
│   └── ui/                       # Reusable UI
├── content/
│   └── blog/                     # MDX blog posts
├── lib/                          # Utilities
│   ├── mdx.ts                    # Blog loader
│   ├── firebase.ts               # Firebase config
│   ├── roadmap/                  # Learning paths
│   └── spaced-repetition/        # SM-2 algorithm
└── public/                       # Static assets
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | GitHub/Google OAuth |
| `/interview` | Live coding practice |
| `/dashboard` | User progress & stats |
| `/pricing` | Subscription plans |
| `/blog` | Technical articles |
| `/docs` | Getting started guide |

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/chat` | AI interviewer responses |
| `POST /api/execute` | Code execution sandbox |
| `POST /api/generate-feedback` | Performance analysis |
| `POST /api/create-checkout` | Stripe checkout session |
| `POST /api/customer-portal` | Subscription management |

## Development

```bash
# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

The site deploys automatically to Vercel on push to `main`.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────▶│   Vercel    │────▶│  Production │
│   Push      │     │   Build     │     │   Deploy    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Blog System

The blog uses MDX files with frontmatter:

```mdx
---
title: "Your Post Title"
description: "Meta description for SEO"
date: "2025-12-28"
author: "CodeSparring Team"
category: "dsa" | "faang" | "system-design" | "career" | "guides"
tags: ["tag1", "tag2"]
featured: true | false
---

Your content here...
```

## Security

- **Firebase Security Rules**: Row-level security for user data
- **API Rate Limiting**: Protection against abuse
- **Content Security Policy**: XSS prevention
- **Server-only imports**: Sensitive code protected

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

Proprietary - All rights reserved.

## Support

- **Issues**: [GitHub Issues](https://github.com/Nikayel/MockmateWebsite/issues)
- **Email**: support@codesparring.dev
- **Twitter**: [@codesparring](https://twitter.com/codesparring)

---

<div align="center">

**Built with caffeine and determination**

[Website](https://codesparring.com) • [Blog](https://codesparring.com/blog) • [Pricing](https://codesparring.com/pricing)

</div>
