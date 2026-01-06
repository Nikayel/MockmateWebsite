# Deployment Workflow Guide

This document describes the recommended deployment workflow for CodeSparring, including branch strategy, staging workflow, and post-deployment tasks.

## Branch Strategy

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Feature/Fix    │ ───> │   Development   │ ───> │     main        │
│    Branches     │      │    (update)     │      │  (Production)   │
│  claude/*       │      │                 │      │                 │
│  feat/*         │      │  Batch changes  │      │  Auto-deploys   │
│  fix/*          │      │  Test together  │      │  to Vercel      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Branch Types

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production code | Vercel Production |
| `update` | Staging/batching | Vercel Preview (optional) |
| `feat/*` | New features | PR Preview |
| `fix/*` | Bug fixes | PR Preview |
| `claude/*` | Claude Code sessions | PR Preview |

## Recommended Workflow

### 1. Daily Development

Work on feature branches (`claude/*`, `feat/*`, `fix/*`):

```bash
# Create feature branch
git checkout -b feat/add-new-feature

# Make changes, commit
git add .
git commit -m "feat(scope): add new feature"

# Push to remote
git push -u origin feat/add-new-feature

# Create PR to 'update' branch (NOT main)
```

### 2. Batch Changes on Update Branch

Instead of merging every change directly to `main`:

```bash
# Switch to update branch
git checkout update
git pull origin update

# Merge your feature branch
git merge feat/add-new-feature

# Or merge multiple branches at once
git merge feat/feature-1 feat/feature-2 fix/bug-fix

# Push to update
git push origin update
```

**Why batch?**
- Test multiple changes together before production
- Reduce deployment frequency (Vercel has build limits)
- Catch integration issues before they hit production
- Group related changes in a single deployment

### 3. Deploy to Production

When ready to deploy (e.g., weekly or when stable):

```bash
# Ensure update branch is stable
git checkout update
pnpm lint
pnpm typecheck
pnpm build
pnpm test

# Merge to main
git checkout main
git pull origin main
git merge update

# Push to deploy
git push origin main
```

This triggers:
1. GitHub CI (lint, typecheck, test, build)
2. Vercel production deployment
3. Any webhooks/notifications configured

### 4. Post-Deployment Tasks

After deploying to production, run one-time tasks:

#### Vectorization (New Scenarios)
If you added new DSA/System Design/Bug Fix scenarios:

```bash
# Via API endpoint (requires admin auth)
curl -X POST https://codesparring.dev/api/vectorize-problems \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Or via admin dashboard
# Go to /admin → Settings → Run Vectorization
```

#### Database Migrations
If schema changed:
```bash
# Check migration status
curl https://codesparring.dev/api/rag/health
```

## Quick Reference

### Merge Feature → Update (Staging)
```bash
git checkout update
git merge feat/my-feature
git push origin update
```

### Deploy Update → Main (Production)
```bash
git checkout main
git merge update
git push origin main
```

### Sync Update with Main (After Hotfix)
```bash
git checkout update
git merge main
git push origin update
```

## CI/CD Pipeline

Our GitHub Actions CI runs on:
- **Push to main**: Full pipeline (lint → test → build)
- **PRs to main**: Full pipeline (blocks merge if failing)

### Pipeline Steps

1. **Lint & Type Check**
   - ESLint validation
   - TypeScript strict mode check

2. **Test**
   - Unit tests
   - Integration tests

3. **Build**
   - Next.js production build
   - Bundle size check

## Environment-Specific Configs

| Environment | Branch | URL | Firebase |
|-------------|--------|-----|----------|
| Production | `main` | codesparring.dev | Production project |
| Preview | PRs | *.vercel.app | Production project |
| Local | N/A | localhost:3000 | Dev/Emulator |

## Deployment Checklist

### Before Merging to Main

- [ ] All CI checks pass on `update` branch
- [ ] Manually tested critical flows (auth, interview, payment)
- [ ] No console errors in browser
- [ ] Mobile responsive check
- [ ] Check bundle size hasn't increased dramatically

### After Deploying to Main

- [ ] Verify production site loads
- [ ] Test authentication flow
- [ ] Run vectorization if new scenarios added
- [ ] Check error monitoring (if configured)
- [ ] Monitor for any spike in errors

## Hotfix Process

For urgent production fixes:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b fix/urgent-bug

# Make fix, test locally
git add .
git commit -m "fix(critical): resolve payment processing error"

# Push and create PR directly to main
git push -u origin fix/urgent-bug
# Create PR: fix/urgent-bug → main

# After merge, sync update branch
git checkout update
git merge main
git push origin update
```

## One-Time Setup

If `update` branch doesn't exist yet:

```bash
# Create update branch from main
git checkout main
git pull origin main
git checkout -b update
git push -u origin update
```

## Vercel Settings

Recommended Vercel project settings:

- **Production Branch**: `main`
- **Preview Branches**: `update`, `feat/*`, `fix/*`, `claude/*`
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`
- **Framework Preset**: Next.js

## Summary: Your Workflow

1. **Develop** on feature branches (`claude/*`, `feat/*`, `fix/*`)
2. **Merge** to `update` branch to batch changes
3. **Test** on `update` branch (locally or preview deployment)
4. **Deploy** by merging `update` → `main` when ready
5. **Post-deploy** tasks (vectorization, etc.)

This keeps production stable while allowing rapid development!
