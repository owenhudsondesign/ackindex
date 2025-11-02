# GlitchTip Error Monitoring Setup

## What is GlitchTip?

GlitchTip is an open-source error tracking platform that is **fully compatible with Sentry's SDK**. We chose GlitchTip because:

- ✅ **Free tier**: 1,000 errors/month (perfect for early stage)
- ✅ **Affordable**: $15/mo for 100,000 errors (vs Sentry's expensive tiers)
- ✅ **Sentry-compatible**: Uses the same `@sentry/nextjs` SDK
- ✅ **Open source**: Can self-host later if needed
- ✅ **Simple**: Easy to set up and maintain

## Quick Start (GlitchTip Cloud)

### 1. Sign up for GlitchTip Cloud

1. Go to [https://glitchtip.com](https://glitchtip.com)
2. Click **"Sign Up"** (free, no credit card required)
3. Create your account

### 2. Create a Project

1. After signing in, click **"Create Project"**
2. Choose **"Next.js"** as the platform
3. Name it `AckIndex` (or your preferred name)
4. Click **"Create Project"**

### 3. Get Your DSN

After creating the project, GlitchTip will show you a **DSN** (Data Source Name) that looks like:

```
https://abc123def456@app.glitchtip.com/789
```

**Copy this DSN** - you'll need it in the next step.

### 4. Configure Environment Variables

#### For Vercel (Next.js App)

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add the following variables for **Production, Preview, and Development**:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@app.glitchtip.com/789

# Optional: For uploading source maps (helps with debugging)
SENTRY_ORG=your-glitchtip-org-name
SENTRY_PROJECT=ackindex
SENTRY_AUTH_TOKEN=glitchTip_your_auth_token_here
```

#### For Railway (Worker Process)

1. Go to your Railway project
2. Select the **Worker** service
3. Navigate to **Variables** tab
4. Add:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@app.glitchtip.com/789
```

#### For Local Development

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@app.glitchtip.com/789
```

### 5. Deploy

After setting environment variables:

1. **Redeploy Vercel**: Trigger a new deployment (or push to git)
2. **Restart Railway Worker**: Restart the worker service in Railway dashboard

### 6. Test It Works

#### Test Browser Errors

1. Open your site in a browser
2. Open browser console (F12)
3. Run this command:

```javascript
throw new Error("Test GlitchTip browser error");
```

4. Check GlitchTip dashboard - you should see the error appear within seconds!

#### Test API Errors

Make a test API request that triggers an error, or manually trigger one:

```typescript
import { captureException } from '@/lib/sentry';

// In any API route or server component
captureException(new Error('Test API error'), {
  tags: { test: true },
  extra: { userId: '123' }
});
```

#### Test Worker Errors

Trigger a scraping job that will fail, or check Railway logs for worker startup confirmation:

```
✅ Sentry initialized for worker error tracking
```

## What's Already Integrated

GlitchTip error monitoring is already integrated throughout AckIndex:

### ✅ Browser (Client-Side)
- Automatic error capturing
- Session replay on errors
- User feedback collection
- **Config**: `sentry.client.config.ts`

### ✅ Server (API Routes, SSR)
- API route errors
- Server component errors
- Database query failures
- **Config**: `sentry.server.config.ts`

### ✅ Edge Runtime (Middleware)
- Middleware errors
- Edge API routes
- **Config**: `sentry.edge.config.ts`

### ✅ Worker Process (Railway)
- BullMQ job failures
- Scraping errors
- Embedding generation errors
- **Config**: `worker.ts`

### ✅ Helper Utilities
All error tracking uses consistent helpers from `src/lib/sentry.ts`:

```typescript
import { captureException, captureMessage, setUserContext } from '@/lib/sentry';

// Capture an error
try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: { endpoint: '/api/chat' },
    user: { id: userId },
    extra: { query: userQuery }
  });
  throw error;
}

// Log important events
captureMessage('User upgraded to premium', {
  level: 'info',
  tags: { userId: '123' }
});

// Set user context for all subsequent events
setUserContext({ id: user.id, email: user.email });
```

## Viewing Errors in GlitchTip

### Dashboard Overview

The GlitchTip dashboard shows:
- **Recent errors** with timestamps
- **Error frequency** graphs
- **Affected users** count
- **Stack traces** with file/line numbers

### Error Details

Click any error to see:
- Full stack trace
- User context (ID, email, browser)
- Breadcrumbs (actions leading to error)
- Environment (production, preview, development)
- Tags and extra context

### Filtering

Filter errors by:
- Environment (production, preview, development)
- Date range
- User ID
- Custom tags (endpoint, operation, worker, etc.)

## GlitchTip Pricing

### Free Tier
- **1,000 events/month** - Perfect for launch and early growth
- All features included
- No credit card required
- No time limit

### Paid Tiers (when you need more)
- **$5/mo**: 10,000 events/month
- **$15/mo**: 100,000 events/month
- **$50/mo**: 500,000 events/month

**For comparison**: Sentry charges $26/mo for 50,000 errors, and quickly becomes expensive.

### What counts as an "event"?
- 1 error = 1 event
- 1 message = 1 event
- Duplicates are grouped (same error from multiple users = 1 event)

### When will you need to upgrade?

Based on typical usage:
- **Beta (< 100 users)**: Free tier is plenty
- **Launch (100-1000 users)**: Still likely under 1,000 errors/month
- **Growth (1000+ users)**: May need $15/mo tier

GlitchTip automatically groups duplicate errors, so 100 users hitting the same bug = 1 event, not 100.

## Self-Hosting (Advanced)

If you outgrow GlitchTip Cloud or want more control, you can self-host:

### Requirements
- Docker + Docker Compose
- PostgreSQL database
- Redis instance
- ~2GB RAM, 1 CPU core

### Estimated Cost
- **Railway/Render**: ~$10-15/mo
- **AWS/GCP**: ~$15-30/mo
- **Your own server**: Just infrastructure costs

### Setup
GlitchTip provides official Docker images and docker-compose.yml:
https://glitchtip.com/documentation/install

**When to consider self-hosting:**
- You're consistently over 100k events/month
- You want unlimited events
- You need data sovereignty (EU, etc.)

## Troubleshooting

### "No errors appearing in GlitchTip"

1. **Check DSN is set correctly**:
   ```bash
   # Vercel
   vercel env ls

   # Railway
   railway variables
   ```

2. **Check DSN format**:
   - Should start with `https://`
   - Should contain `@app.glitchtip.com/`
   - No trailing slashes

3. **Check environment**:
   - Errors only sent in production by default
   - For testing locally, errors are logged to console

4. **Check GlitchTip project settings**:
   - Project is not paused
   - No rate limits configured

### "Source maps not uploading"

Source maps require auth token:

1. In GlitchTip, go to **Settings → Auth Tokens**
2. Create a new token with **project:write** scope
3. Add to environment variables:
   ```bash
   SENTRY_AUTH_TOKEN=glitchTip_your_token_here
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=ackindex
   ```

### "Too many events, hitting limit"

1. **Add sampling**: In Sentry configs, reduce `tracesSampleRate`:
   ```typescript
   tracesSampleRate: 0.1, // Only capture 10% of transactions
   ```

2. **Filter noisy errors**: Add to `beforeSend`:
   ```typescript
   beforeSend(event) {
     // Ignore certain errors
     if (event.message?.includes('ResizeObserver')) {
       return null; // Don't send to GlitchTip
     }
     return event;
   }
   ```

3. **Upgrade plan** if legitimate errors are being dropped

## Next Steps

After GlitchTip is set up:

1. **Monitor for a week** - Watch for patterns, common errors
2. **Set up alerts** - Get notified of new errors (GlitchTip Settings → Alerts)
3. **Add Pino logging** - Structured logs for debugging (next step in NEXT_STEPS.md)
4. **Review errors regularly** - Fix highest-frequency issues first

## Additional Resources

- **GlitchTip Docs**: https://glitchtip.com/documentation
- **Sentry SDK Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Our Helper Utils**: `src/lib/sentry.ts`
- **GitHub Issues**: https://gitlab.com/glitchtip/glitchtip-backend/-/issues

---

**Questions?** Check the GlitchTip docs or ask in their community forum.
