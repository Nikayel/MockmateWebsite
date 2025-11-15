# MockMate Website

The marketing website and user dashboard for MockMate - a VS Code extension for practicing technical interviews with AI assistance.

## What is MockMate?

MockMate helps developers prepare for technical interviews by simulating realistic coding interviews directly in VS Code. You get an AI interviewer, a coding partner, and full workspace context awareness - just like a real interview.

## Features

- **Landing Page** - Marketing site with features, pricing, and demo
- **User Authentication** - GitHub OAuth via Supabase
- **Account Dashboard** - View subscription status, usage, and manage account
- **Pricing & Upgrades** - Free and Pro tier management
- **Live Demo** - Try MockMate in your browser before installing
- **Documentation** - Complete setup and usage guides

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Firebase** - Authentication and Firestore database
- **Google Gemini** - AI chat functionality
- **Monaco Editor** - Code editor for demo
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
git clone https://github.com/Nikayel/mockmate-website.git
cd mockmate-website
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
STRIPE_PRICE_ID_VSCODE=price_...
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
│   ├── demo/              # Live demo page
│   ├── docs/              # Documentation
│   ├── login/             # Login page
│   ├── pricing/           # Pricing page
│   └── upgrade/           # Upgrade flow
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── lib/                  # Utilities and config
├── public/               # Static assets
└── extension/            # VS Code extension (submodule)
```

## Key Pages

- `/` - Landing page
- `/login` - GitHub OAuth login
- `/account` - User dashboard
- `/pricing` - Pricing plans
- `/upgrade` - Upgrade to Pro
- `/demo` - Live coding interview demo
- `/docs` - Documentation
- `/install` - Installation guide

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

## Connection to Extension

The website and VS Code extension share:
- Same Firebase project (authentication & Firestore database)
- Same user profiles collection
- Same subscription tiers
- OAuth flow: Website → Extension via deep links

When users upgrade on the website, their subscription status is immediately available in the extension.

## Security & Firebase Rules

This project uses Firebase Firestore with Row-Level Security (RLS) rules. See [FIRESTORE_RULES.md](./FIRESTORE_RULES.md) for the complete security rules configuration.

**Important**: Always configure Firestore security rules in your Firebase Console to restrict access to user data. The rules ensure:
- Users can only read/write their own profile
- Users can only access their own interview sessions
- All operations require authentication

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

This project uses a **hybrid open-source approach**:

- **Core functionality, UI components, and interview features**: MIT License (fully open source)
- **Payment processing, proprietary algorithms, and advanced features**: All Rights Reserved (proprietary)

See [PRIVATE.md](./PRIVATE.md) for details on what's open source vs proprietary.

### Open Source Components
- Core UI components and design system
- Authentication and user management
- Interview functionality and AI chat
- Basic dashboard and session management
- Documentation and setup guides

### Proprietary Components
- Stripe payment integration
- Subscription management logic
- Advanced analytics and algorithms
- Business-specific features

This hybrid model allows the community to benefit from the core platform while protecting business-critical components.

## Documentation

Full documentation is available in the [`docs/`](./docs/) directory:

- [Getting Started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Pricing](./docs/PRICING.md)
- [Deployment](./docs/DEPLOYMENT.md)

## Support

For issues or questions, open an issue on GitHub or email support@mockmate.dev
