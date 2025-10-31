# Add CRON_SECRET to Vercel

The cron job endpoint requires a secret key to prevent unauthorized access.

## Generate a Secret

First, generate a random secret (never commit this to git):

```bash
openssl rand -base64 32
```

Copy the output - this is your CRON_SECRET.

## Steps

1. Go to your Vercel Dashboard: https://vercel.com/
2. Select your `ackindex` project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `CRON_SECRET`
   - **Value**: `<paste your generated secret here>`
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**

## Update Local .env.local

Also add it to your local `.env.local` file:

```bash
CRON_SECRET=<paste your generated secret here>
```

## Verification

After deployment, verify the cron endpoint is protected:

```bash
# This should fail with 401 Unauthorized
curl https://your-domain.vercel.app/api/cron/scrape

# This should work (with YOUR secret)
curl -H "Authorization: Bearer YOUR_SECRET_HERE" \
  https://your-domain.vercel.app/api/cron/scrape
```

## Why This is Needed

- The cron endpoint `/api/cron/scrape` can trigger expensive scraping operations
- Without authentication, anyone could spam your endpoint and rack up costs
- Vercel Cron Jobs automatically send this secret in the Authorization header
