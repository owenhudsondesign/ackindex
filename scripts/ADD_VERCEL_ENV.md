# Add CRON_SECRET to Vercel

The cron job endpoint requires a secret key to prevent unauthorized access.

## Steps

1. Go to your Vercel Dashboard: https://vercel.com/
2. Select your `ackindex` project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `CRON_SECRET`
   - **Value**: `x9Eogkw2xD6PgL6xBvbQpyndPAp2lmJOkWsXnhLbtZg=`
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**

## Verification

After deployment, verify the cron endpoint is protected:

```bash
# This should fail with 401 Unauthorized
curl https://your-domain.vercel.app/api/cron/scrape

# This should work (with correct secret)
curl -H "Authorization: Bearer x9Eogkw2xD6PgL6xBvbQpyndPAp2lmJOkWsXnhLbtZg=" \
  https://your-domain.vercel.app/api/cron/scrape
```

## Why This is Needed

- The cron endpoint `/api/cron/scrape` can trigger expensive scraping operations
- Without authentication, anyone could spam your endpoint and rack up costs
- Vercel Cron Jobs automatically send this secret in the Authorization header
