# Railway Deployment Guide for AckIndex Workers

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. GitHub account (for auto-deployment)
3. Your .env.local file with all required environment variables

## Step 1: Push to GitHub

First, commit and push your changes to GitHub:

```bash
# Add all changes
git add .

# Commit
git commit -m "Add BullMQ workers with Railway deployment config"

# Push to GitHub
git push origin main
```

## Step 2: Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `ackindex` repository
4. Railway will detect your configuration automatically

## Step 3: Configure Environment Variables

In the Railway dashboard, add these environment variables:

### Required Variables (copy from your .env.local):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hgcevucxmpapdkwjuzka.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Apify
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=legible_radish/ackindex-3
STAGEHAND_ACTOR_ID=legible_radish/stagehand-nantucket-scraper
ENABLE_STAGEHAND_AUTO_DETECT=true

# Upstash Redis
REDIS_URL=redis://default:****@rested-magpie-32424.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://rested-magpie-32424.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX6oAAIncDJlMWI0MzkxMmFmOGU0NWJjYTFjNjM0YjdhNTJhMTU1NHAyMzI0MjQ
```

### How to Add Variables in Railway:

1. Click on your deployed service
2. Go to "Variables" tab
3. Click "Add Variable"
4. Paste each variable name and value
5. Click "Add" for each one

**OR** use Railway CLI (faster):

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Add variables from .env.local (Railway will prompt for confirmation)
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://hgcevucxmpapdkwjuzka.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="<your-key>"
railway variables set OPENAI_API_KEY="<your-key>"
railway variables set APIFY_API_TOKEN="<your-token>"
railway variables set APIFY_ACTOR_ID="legible_radish/ackindex-3"
railway variables set STAGEHAND_ACTOR_ID="legible_radish/stagehand-nantucket-scraper"
railway variables set ENABLE_STAGEHAND_AUTO_DETECT="true"
railway variables set REDIS_URL="redis://default:****@rested-magpie-32424.upstash.io:6379"
railway variables set UPSTASH_REDIS_REST_URL="https://rested-magpie-32424.upstash.io"
railway variables set UPSTASH_REDIS_REST_TOKEN="<your-token>"
```

## Step 4: Deploy

Railway will automatically deploy when you push to GitHub. You can also manually trigger a deployment:

1. In Railway dashboard, click "Deploy"
2. Or push to GitHub: `git push origin main`

## Step 5: Verify Deployment

Check the logs to ensure workers are running:

1. Go to Railway dashboard
2. Click on your service
3. Click "Logs" tab
4. You should see:

```
==============================================
🚀 AckIndex BullMQ Workers Starting...
==============================================
Redis URL: Connected
----------------------------------------------
📊 Worker Status:
  Scraping Worker: ✅ Running
  Embedding Worker: ✅ Running
==============================================
```

## Step 6: Monitor Workers

### Via API (from your Next.js app):

```bash
# Check worker status
curl https://your-app.vercel.app/api/admin/workers

# View queue dashboard
curl https://your-app.vercel.app/api/admin/queue-dashboard
```

### Via Railway Dashboard:

1. View logs in real-time
2. Check memory/CPU usage
3. Restart service if needed

## Pricing

Railway offers:
- **Free Tier**: $5 free credit per month (good for testing)
- **Developer Plan**: $5/month for hobby projects
- **Pro Plan**: $20/month + usage for production

**Estimated costs for AckIndex:**
- Worker service: ~$5-10/month (minimal CPU/memory)
- Total: ~$5-10/month

## Auto-Deployment

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update workers"
git push origin main
```

Railway will:
1. Pull latest code
2. Install dependencies
3. Restart worker service
4. Workers start processing jobs

## Troubleshooting

### Workers Not Starting

**Check environment variables:**
```bash
railway logs
```

Look for errors about missing env vars.

**Solution:**
- Add missing variables in Railway dashboard
- Redeploy

### Redis Connection Issues

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solutions:**
1. Verify `REDIS_URL` is correct
2. Check Upstash Redis is active
3. Ensure TLS is enabled (Upstash requires it)

### Worker Crashes

**Check logs:**
```bash
railway logs --follow
```

**Common causes:**
- Missing environment variables
- Database connection issues
- API rate limits exceeded

**Solution:**
- Fix missing env vars
- Check Supabase connection
- Verify OpenAI/Apify API keys

### High Memory Usage

Railway will automatically restart if memory exceeds limits.

**Solutions:**
- Reduce worker concurrency (edit src/lib/workers.ts)
- Upgrade Railway plan for more memory
- Optimize batch sizes

## Scaling

As your usage grows:

### Horizontal Scaling (Multiple Workers)

Deploy multiple worker instances:

1. Duplicate service in Railway
2. Add environment variables
3. Both services process jobs from same Redis queue
4. Jobs are distributed automatically

### Vertical Scaling (More Resources)

Upgrade Railway plan for:
- More CPU
- More memory
- Higher priority scheduling

## Monitoring Setup (Optional)

### Add Sentry for Error Tracking

1. Sign up at https://sentry.io
2. Add to package.json:
   ```bash
   npm install @sentry/node
   ```
3. Update worker.ts:
   ```typescript
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: 'production',
   });
   ```

### Add Health Check Endpoint

Create `/api/admin/health` endpoint for Railway health checks.

## Backup Strategy

Railway doesn't provide automatic backups, so:

1. **Code**: Stored in GitHub (auto-backup)
2. **Environment Variables**: Export regularly
3. **Database**: Supabase handles backups
4. **Redis/Queues**: Jobs are transient (no backup needed)

## Commands Reference

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs

# Follow logs in real-time
railway logs --follow

# Set environment variable
railway variables set KEY=value

# Restart service
railway restart

# Open Railway dashboard
railway open
```

## Next Steps

After deployment:

1. ✅ Verify workers are running (check logs)
2. ✅ Test scraping a URL from your app
3. ✅ Test embedding generation
4. ✅ Monitor queue dashboard
5. ✅ Set up alerts (optional)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**Ready to deploy?** Follow the steps above to get your workers running on Railway! 🚀
