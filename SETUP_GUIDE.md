# AckIndex Setup Guide

Complete setup guide for running AckIndex locally and in production.

---

## Prerequisites

- Node.js 18+ and npm
- Git
- Accounts for:
  - Supabase (database)
  - OpenAI (embeddings & chat)
  - Stripe (payments)
  - Upstash/Redis (job queue)
  - Sentry/GlitchTip (optional, error monitoring)

---

## Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone <repository-url>
cd ackindex
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

### 3. Configure Services

Follow the detailed setup sections below for each service.

---

## Supabase Setup

### Create Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Choose project name, password, and region
4. Wait ~2 minutes for provisioning

### Get API Keys

1. Go to **Project Settings** → **API**
2. Copy these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Run Migrations

Apply database schema:

```bash
# Run all migrations in order
npx supabase db push
```

Or manually apply migrations from `supabase/migrations/` in the Supabase SQL Editor.

### Create Admin User

After migrations, create an admin account:

```sql
-- In Supabase SQL Editor
INSERT INTO user_profiles (id, email, role, subscription_tier)
VALUES (
  '<your-supabase-auth-user-id>',
  'admin@example.com',
  'admin',
  'premium'
);
```

---

## OpenAI Setup

### Get API Key

1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add to `.env.local`:

```env
OPENAI_API_KEY=sk-...
```

### Configure Models

The app uses:
- `text-embedding-ada-002` for embeddings
- `gpt-4o-mini` for chat responses

Both are configured in `src/lib/embeddings.ts` and `src/lib/retrieval.ts`.

---

## Stripe Setup

### Create Account

1. Go to https://stripe.com and sign up
2. Switch to **Test Mode** for development

### Get API Keys

1. Go to **Developers** → **API keys**
2. Copy to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Create Products

Create a Premium subscription product:

1. Go to **Products** → **Add Product**
2. Set:
   - Name: "Premium Plan"
   - Price: $9.99/month
   - Billing: Recurring monthly
3. Copy the Price ID to `.env.local`:

```env
STRIPE_PREMIUM_PRICE_ID=price_...
```

### Configure Webhooks

1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

For local testing, use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Redis/Upstash Setup (Job Queue)

### Create Upstash Database

1. Go to https://upstash.com
2. Create new Redis database
3. Choose region close to your deployment
4. Copy credentials to `.env.local`:

```env
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
```

### Alternative: Local Redis

For local development, you can use Docker:

```bash
docker run -d -p 6379:6379 redis:alpine
```

Then use:

```env
UPSTASH_REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_TOKEN=
```

---

## Sentry/GlitchTip Setup (Optional)

### Create Account

Choose one:
- **Sentry**: https://sentry.io (paid, better features)
- **GlitchTip**: https://glitchtip.com (open source, cheaper)

### Get DSN

1. Create new project
2. Copy DSN to `.env.local`:

```env
SENTRY_DSN=https://...@sentry.io/...
# OR
GLITCHTIP_DSN=https://...@glitchtip.com/...
```

### Configure

Error monitoring is automatically initialized in:
- `instrumentation.ts` (Next.js)
- `sentry.client.config.ts` (browser)
- `sentry.server.config.ts` (server)
- `sentry.edge.config.ts` (edge functions)

---

## Apify Setup (Web Scraping)

### Create Account

1. Go to https://apify.com
2. Sign up for free account

### Deploy Actors

Deploy the scraping actors from `apify-actors/`:

```bash
cd apify-actors/nantucket-playwright-scraper
apify push
```

### Get API Token

1. Go to **Settings** → **Integrations**
2. Copy API token to `.env.local`:

```env
APIFY_API_TOKEN=apify_api_...
```

---

## Email Setup (Optional)

### Configure SMTP

For contact form and notifications, add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password
3. Use that as `SMTP_PASSWORD`

---

## Admin Authentication

### Set Admin Password

Add admin credentials to `.env.local`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here
```

⚠️ **Important**: Change the default password in production!

### Access Admin Panel

1. Go to `/admin/login`
2. Enter credentials
3. Access admin dashboard at `/admin`

---

## Running the Application

### Development Mode

```bash
npm run dev
```

App runs at http://localhost:3000

### Start Worker (Job Queue Processing)

In a separate terminal:

```bash
npm run worker
```

This processes:
- Web scraping jobs
- PDF processing
- Embedding generation

### Build for Production

```bash
npm run build
npm start
```

---

## Database Migrations

### Apply New Migrations

```bash
npx supabase db push
```

### Create New Migration

```bash
npx supabase migration new <migration-name>
```

Edit the generated file in `supabase/migrations/`, then push.

---

## Troubleshooting

### "Database connection failed"

- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify Supabase project is running
- Check network connectivity

### "OpenAI API error"

- Verify `OPENAI_API_KEY` is correct
- Check your OpenAI account has credits
- Ensure API key has correct permissions

### "Redis connection failed"

- Check `UPSTASH_REDIS_URL` format
- Verify Upstash database is active
- For local Redis, ensure Docker container is running

### "Stripe webhook signature verification failed"

- Check `STRIPE_WEBHOOK_SECRET` matches
- For local testing, use Stripe CLI
- Ensure webhook endpoint is publicly accessible

### Worker not processing jobs

- Verify Redis connection
- Check worker is running (`npm run worker`)
- View Bull Board dashboard at `/api/admin/bull-board`

---

## Next Steps

After setup:

1. **Configure web scraping**: See `INTEGRATION_GUIDE.md` (archived)
2. **Deploy to production**: See `DEPLOYMENT.md`
3. **Review architecture**: See `ARCHITECTURE.md`
4. **Check roadmap**: See `NEXT_STEPS.md`

---

## Support

For detailed archived guides, see:
- `docs/archive/setup-guides/` - Individual service setup guides
- `docs/archive/BULLMQ-GUIDE.md` - Job queue details
- `docs/archive/SQL-MIGRATIONS-GUIDE.md` - Database migration guide

---

**Last Updated**: November 5, 2025
