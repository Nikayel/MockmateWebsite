# Skillon

The web platform and user dashboard for Skillon - an AI-powered coding interview practice platform.

## What is Skillon?

Skillon helps developers prepare for technical interviews by simulating realistic coding interviews with an AI interviewer. Practice in your browser with real-time feedback and comprehensive performance analytics.

**VS Code Extension coming soon** - Sign up on the website to get notified when it launches!

## Features

- **Landing Page** - Marketing site with features, pricing, and sample reports
- **User Authentication** - GitHub/Google OAuth via Firebase
- **Account Dashboard** - View subscription status, usage, and manage account
- **Pricing & Upgrades** - Free and Pro tier management
- **Live Practice** - Practice coding interviews directly in your browser
- **Documentation** - Complete setup and usage guides
- **AI Feedback** - Detailed performance analytics and improvement recommendations

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Firebase** - Authentication and Firestore database
- **Google Gemini** - AI chat functionality
- **Monaco Editor** - Code editor
- **Stripe** - Payment processing (proprietary)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Firebase account (for authentication and Firestore)
- Google Gemini API key

### Installation

1. Clone the repo:
```bash
git clone https://github.com/Nikayel/skillon-website.git
cd skillon-website
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your `.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Stripe Configuration (for payment features - proprietary)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_WEBSITE=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. Run the dev server:
```bash
pnpm dev
```

Visit `http://localhost:3000`

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── account/           # User dashboard
│   ├── auth/              # Auth callbacks
│   ├── interview/         # Interview practice page
│   ├── docs/              # Documentation
│   ├── login/             # Login page
│   ├── pricing/           # Pricing page
│   └── upgrade/           # Upgrade flow
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── lib/                  # Utilities and config
└── public/               # Static assets
```

## Key Pages

- `/` - Landing page
- `/login` - GitHub/Google OAuth login
- `/account` - User dashboard
- `/pricing` - Pricing plans
- `/upgrade` - Upgrade to Pro
- `/interview` - Live coding interview practice
- `/docs` - Documentation
- `/install` - VS Code extension coming soon page

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key (proprietary) | No* |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (proprietary) | No* |

\* Required only for payment features (proprietary)

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

## Deployment

The site is deployed on Vercel. Push to `main` branch to deploy automatically.

## Security & Firebase Rules

This project uses Firebase Firestore with Row-Level Security (RLS) rules. See [FIRESTORE_RULES.md](./FIRESTORE_RULES.md) for the complete security rules configuration.

**Important**: Always configure Firestore security rules in your Firebase Console to restrict access to user data.

## API Endpoints

The website provides several API endpoints for core functionality:

- **`/api/chat`** - AI interviewer chat responses using Google Gemini
- **`/api/execute`** - Code execution for testing interview solutions
- **`/api/generate-feedback`** - Performance feedback generation after interviews
- **`/api/create-checkout`** - Stripe payment checkout session creation
- **`/api/customer-portal`** - Stripe customer portal for subscription management
- **`/api/sync-subscription`** - Subscription synchronization with Firestore
- **`/api/promo-code`** - Promotional code validation

All API endpoints implement rate limiting for security and stability.

## Support

For issues or questions, open an issue on GitHub or email support@skillon.dev
