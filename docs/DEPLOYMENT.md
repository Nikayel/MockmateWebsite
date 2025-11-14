# Deployment Guide

How to deploy MockMate website and extension.

## Website Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Deploy

Vercel automatically deploys on every push to `main`.

### Manual Build

```bash
pnpm build
pnpm start
```

## Extension Deployment

### VS Code Marketplace

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build package:
   ```bash
   npm run package
   ```
4. Upload `.vsix` to VS Code Marketplace
5. Submit for review

### Self-Hosting

1. Build extension:
   ```bash
   npm run package
   ```
2. Install `.vsix` file manually:
   ```bash
   code --install-extension mockmate-0.0.1.vsix
   ```

## Supabase Setup

### Database Schema

Create the `profiles` table:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  subscription_tier TEXT DEFAULT 'free',
  simulations_used INTEGER DEFAULT 0,
  usage_reset_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Edge Functions

Deploy each function:

```bash
supabase functions deploy usage-gate
supabase functions deploy chat-proxy
supabase functions deploy session-start
supabase functions deploy session-event
supabase functions deploy session-finalize
supabase functions deploy upgrade-tier
```

### Environment Variables

Set in Supabase Dashboard → Edge Functions → Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_API_KEY`
- `OPENAI_API_KEY` (optional)

### GitHub OAuth

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable GitHub provider
3. Add GitHub OAuth app credentials
4. Set redirect URLs:
   - `https://your-website.com/auth/callback`
   - `vscode://nikayel.MockMate/auth-callback`

## Environment Checklist

### Website
- [ ] Supabase project created
- [ ] Database schema set up
- [ ] Edge Functions deployed
- [ ] GitHub OAuth configured
- [ ] Environment variables set
- [ ] Vercel deployment configured

### Extension
- [ ] Extension built and tested
- [ ] VS Code Marketplace account created
- [ ] Extension published (or self-hosted)

## Monitoring

### Website
- Vercel Analytics
- Supabase Dashboard
- Error tracking (Sentry recommended)

### Extension
- VS Code Marketplace analytics
- Supabase usage logs
- Error reports from users

## Troubleshooting

### Website Not Loading
- Check Vercel deployment status
- Verify environment variables
- Check Supabase connection

### Extension Not Working
- Verify Supabase Edge Functions are deployed
- Check API keys are set
- Review extension logs in VS Code

### Authentication Issues
- Verify GitHub OAuth is configured
- Check redirect URLs match
- Review Supabase Auth logs

