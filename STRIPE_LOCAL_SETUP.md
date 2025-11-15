# Stripe Local Development Setup

## Quick Setup for Localhost

### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### 2. Login to Stripe
```bash
stripe login
```

### 3. Forward Webhooks to Localhost
In a separate terminal, run:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

This will:
- Forward Stripe webhooks to your local server
- Display a webhook signing secret (starts with `whsec_`)
- Show webhook events in real-time

### 4. Copy Webhook Secret
When you run `stripe listen`, you'll see:
```
> Ready! Your webhook signing secret is whsec_xxxxx
```

Copy that secret and add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5. Test Payments
1. Start your Next.js dev server: `npm run dev`
2. Go to `/upgrade` page
3. Click "Upgrade to Pro"
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Watch the `stripe listen` terminal for webhook events

## Finding Price IDs

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Click on your product
3. In the "Pricing" section, you'll see prices listed
4. Each price has an ID starting with `price_`
5. Copy the Price ID for the monthly subscription

## Environment Variables Needed

Add these to `.env.local`:
```env
# Stripe Keys (you already have these)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Price IDs (get from Stripe Dashboard)
STRIPE_PRICE_ID_WEBSITE=price_xxxxx  # $25/month
STRIPE_PRICE_ID_VSCODE=price_xxxxx   # $19/month

# Webhook Secret (from `stripe listen` command)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App URL (for localhost)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Production Setup (When Deployed)

When your site is live:
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/webhook/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in your production environment variables

