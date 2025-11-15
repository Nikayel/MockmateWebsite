# API Keys Setup Guide

## Current API Keys Location

Your API keys are stored in `.env.local` file (which is gitignored for security).

## Required API Keys

### 1. Google Gemini API Key
- **Variable**: `GEMINI_API_KEY`
- **Location**: `.env.local`
- **Purpose**: Powers the AI Interviewer and AI Coding Partner
- **Get it from**: https://makersuite.google.com/app/apikey
- **Status**: ✅ Already configured in code

### 2. Firebase Configuration
- **Variables**: Already configured in `lib/firebase.ts`
- **Purpose**: Authentication and database
- **Status**: ✅ Already set up

## How to Check Your API Keys

1. **Check if `.env.local` exists**:
   ```bash
   ls -la .env.local
   ```

2. **View your API keys** (be careful not to commit this):
   ```bash
   cat .env.local
   ```

3. **Required format** (`.env.local`):
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

## Environment Variables Reference

### Development (`.env.local`)
- `GEMINI_API_KEY` - Google Gemini API key for AI chat

### Production
When deploying, add these environment variables to your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Other platforms: Check their documentation

## Security Notes

✅ `.env.local` is already in `.gitignore` - your keys won't be committed
✅ Never commit API keys to git
✅ Use different keys for development and production
✅ Rotate keys if they're accidentally exposed

## Troubleshooting

**Issue**: "Failed to process chat message" or API errors
- **Solution**: Check that `GEMINI_API_KEY` is set in `.env.local`
- **Verify**: Restart your dev server after adding keys

**Issue**: "API key not found"
- **Solution**: Make sure `.env.local` exists in the project root
- **Solution**: Ensure the variable name matches exactly: `GEMINI_API_KEY`

