# Deployment Guide

Complete guide for deploying AckIndex to production.

---

## Deployment Architecture

AckIndex consists of two main components:

1. **Web Application** (Next.js) → Deploy to **Vercel**
2. **Background Worker** (BullMQ) → Deploy to **Railway**

Both connect to:
- Supabase (PostgreSQL + Auth)
- Upstash Redis (Job Queue)
- OpenAI API
- Stripe

---

## Prerequisites

Before deploying:

- [ ] Complete local setup (`SETUP_GUIDE.md`)
- [ ] All services configured (Supabase, OpenAI, Stripe, Redis)
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Git repository with code

---

## Part 1: Deploy Web App to Vercel

### 1. Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub/GitLab/Bitbucket
3. Import your repository

### 2. Configure Project

**Framework Preset**: Next.js
**Build Command**: `npm run build`
**Output Directory**: `.next`

### 3. Add Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add all from `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_live_... (use live keys for production!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis/Upstash
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...

# Admin Auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>

# Sentry (Optional)
SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=ackindex

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Cron Secret (generate random string)
CRON_SECRET=<random-secret-string>
```

**Important**: Use **production** keys for Stripe, not test keys!

### 4. Deploy

Click **Deploy** and wait for build to complete (~2-3 minutes).

### 5. Verify Deployment

1. Visit your Vercel URL (e.g., `https://ackindex.vercel.app`)
2. Test:
   - Homepage loads
   - Chat interface works
   - Admin login (`/admin/login`)
   - Database connections work

---

## Part 2: Deploy Worker to Railway

The worker processes background jobs (scraping, PDF processing, embeddings).

### 1. Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project

### 2. Deploy from GitHub

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Choose your repository
4. Railway will detect `worker.ts`

### 3. Configure Build

Railway should auto-detect Node.js. If not, set:

**Build Command**:
```bash
npm install && npm run build
```

**Start Command**:
```bash
node worker.js
```

### 4. Add Environment Variables

In Railway project → **Variables**, add the same environment variables as Vercel (except `NEXT_PUBLIC_*` vars are not needed).

**Minimal required for worker**:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
OPENAI_API_KEY=sk-...
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
SENTRY_DSN=https://... (optional)
```

### 5. Deploy Worker

Railway will automatically deploy on push to main branch.

### 6. Verify Worker is Running

Check Railway logs:

```
✓ Worker started successfully
✓ Connected to Redis
✓ Processing queue: scraping
✓ Processing queue: embedding
✓ Processing queue: pdf
```

---

## Part 3: Configure Production Services

### Stripe Webhooks

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

### Scheduled Scraping (Cron Jobs)

Vercel Cron is configured in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/scrape",
    "schedule": "0 2 * * *"
  }]
}
```

This runs daily at 2 AM UTC. To secure the endpoint:

1. Generate random secret: `openssl rand -base64 32`
2. Add to Vercel env vars as `CRON_SECRET`
3. The cron endpoint checks this secret

### Supabase Connection Pooling

For production, enable connection pooling:

1. Go to Supabase → **Database** → **Connection Pooling**
2. Use **Transaction mode** connection string
3. Update `NEXT_PUBLIC_SUPABASE_URL` in Vercel

### Enable Production Error Monitoring

If using Sentry:

1. Go to Sentry dashboard
2. Create production environment
3. Verify errors are being captured

---

## Part 4: Custom Domain (Optional)

### Add Domain to Vercel

1. Go to Vercel project → **Settings** → **Domains**
2. Add your custom domain (e.g., `ackindex.com`)
3. Update DNS records as instructed by Vercel

**DNS Configuration**:
- Add `A` record pointing to Vercel IP
- Or add `CNAME` record to `cname.vercel-dns.com`

### Update Environment Variables

After domain is configured:

```env
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

Redeploy to apply changes.

---

## Monitoring & Maintenance

### Health Checks

Monitor these endpoints:

- **Web App**: `https://your-domain.com/` (should return 200)
- **API**: `https://your-domain.com/api/health` (if you create one)
- **Worker**: Check Railway logs for activity

### Queue Dashboard

Monitor background jobs:

1. Go to `https://your-domain.com/api/admin/bull-board`
2. Login with admin credentials
3. View:
   - Active jobs
   - Completed jobs
   - Failed jobs
   - Queue metrics

### Database Monitoring

Check Supabase dashboard:
- Database size
- Active connections
- Query performance
- API usage

### Cost Monitoring

**Expected monthly costs** (estimated):

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Pro | $20/month (or free for hobby) |
| Railway | Hobby | $5/month |
| Supabase | Pro | $25/month |
| Upstash Redis | Pay-as-you-go | ~$3-5/month |
| OpenAI | API usage | ~$30-80/month |
| Stripe | Per transaction | 2.9% + $0.30 |
| **Total** | | **~$83-135/month** |

**Cost optimization tips**:
- Implement caching (see `NEXT_STEPS.md`)
- Limit OpenAI context window
- Use GPT-4o-mini instead of GPT-4
- Monitor and delete old completed jobs

---

## Rollback Procedure

If deployment fails:

### Vercel (Web App)

1. Go to Vercel → **Deployments**
2. Find last working deployment
3. Click **...** → **Promote to Production**

### Railway (Worker)

1. Go to Railway → **Deployments**
2. Click on previous deployment
3. Click **Redeploy**

### Database (Migrations)

To rollback a migration:

```bash
# Manually revert in Supabase SQL Editor
# Or apply a new "down" migration
```

Always test migrations in staging environment first!

---

## Scaling Considerations

### Horizontal Scaling

**When to scale**:
- Response time > 2s (p95)
- CPU usage > 80%
- Redis queue backlog growing

**How to scale**:

1. **Web App**: Vercel auto-scales (no action needed)
2. **Worker**: Deploy multiple Railway instances
   - Create duplicate Railway service
   - Connect to same Redis
   - Workers will distribute jobs automatically
3. **Database**: Upgrade Supabase plan or enable read replicas

### Vertical Scaling

**Upgrade tiers**:
- Supabase Pro → Team ($25 → $599/month)
- Railway Hobby → Pro ($5 → $20/month)
- Upstash free → paid tier

---

## Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Use strong `CRON_SECRET`
- [ ] Enable Supabase RLS (Row Level Security)
- [ ] Add rate limiting to API routes
- [ ] Configure CORS properly
- [ ] Enable HTTPS only
- [ ] Rotate API keys regularly
- [ ] Set up Sentry alerts
- [ ] Enable Supabase auth email verification
- [ ] Review and test all webhooks
- [ ] Backup database regularly

---

## Backup & Disaster Recovery

### Database Backups

Supabase Pro includes daily backups (retained 7 days).

**Manual backup**:

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Or use Supabase CLI
supabase db dump -f backup.sql
```

### Restore from Backup

```bash
# Restore to local database
psql $DATABASE_URL < backup.sql

# Or use Supabase dashboard → Database → Restore
```

### Redis Backup

Upstash includes persistence. For additional safety:
- Export job data periodically
- Store in S3 or similar

---

## Troubleshooting Production Issues

### "Application Error" on Vercel

1. Check Vercel logs: Project → **Logs**
2. Common causes:
   - Missing environment variable
   - Build failure
   - Runtime error in server component

### Worker Not Processing Jobs

1. Check Railway logs
2. Verify Redis connection
3. Check Bull Board dashboard
4. Restart worker service in Railway

### High OpenAI Costs

1. Check usage: https://platform.openai.com/usage
2. Implement query caching (see Phase 2 tasks)
3. Reduce context window size
4. Limit queries per user

### Database Connection Errors

1. Check Supabase project status
2. Verify connection string
3. Check connection pool limits
4. Upgrade Supabase plan if needed

---

## CI/CD Pipeline (Optional)

Set up automated testing and deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## Post-Deployment Checklist

- [ ] Verify all pages load
- [ ] Test chat functionality end-to-end
- [ ] Test admin panel
- [ ] Test subscription flow
- [ ] Verify webhooks are working
- [ ] Check worker is processing jobs
- [ ] Verify error monitoring is active
- [ ] Test email notifications
- [ ] Load test the application
- [ ] Set up monitoring alerts

---

## Additional Resources

- Vercel Documentation: https://vercel.com/docs
- Railway Documentation: https://docs.railway.app
- Supabase Production Checklist: https://supabase.com/docs/guides/platform/going-into-prod
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Last Updated**: November 5, 2025
