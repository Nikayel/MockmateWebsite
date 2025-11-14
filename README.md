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
- **Supabase** - Authentication and database
- **Google Gemini** - AI chat functionality
- **Monaco Editor** - Code editor for demo

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- Supabase account
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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
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
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

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
- Same Supabase project (authentication & database)
- Same user profiles table
- Same subscription tiers
- OAuth flow: Website → Extension via deep links

When users upgrade on the website, their subscription status is immediately available in the extension.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT

## Support

For issues or questions, open an issue on GitHub or email support@mockmate.dev
