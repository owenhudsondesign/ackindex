# 💳 Stripe Setup Guide for AckIndex

This guide will help you set up Stripe for subscription billing in AckIndex.

---

## Overview

AckIndex uses Stripe for:
- Premium subscription management ($9.99/month)
- Payment processing
- Customer billing portal
- Webhook notifications for subscription events

---

## Step 1: Create a Stripe Account

1. Go to https://stripe.com
2. Click **Sign up**
3. Complete the registration process
4. Verify your email address

---

## Step 2: Get Your API Keys

### Development Keys (Test Mode)

1. Log in to your Stripe Dashboard
2. Make sure you're in **Test Mode** (toggle in the top right)
3. Go to **Developers** → **API keys**
4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Add Keys to `.env.local`

```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

---

## Step 3: Create a Product and Price

### Create Premium Subscription Product

1. In Stripe Dashboard, go to **Products** → **Add Product**
2. Fill in the details:
   - **Name:** AckIndex Premium
   - **Description:** Unlimited chatbot usage with priority support
   - **Pricing:**
     - Type: **Recurring**
     - Price: **$9.99**
     - Billing period: **Monthly**
3. Click **Save product**

### Get the Price ID

1. After creating the product, click on it
2. In the **Pricing** section, find your price
3. Copy the **Price ID** (starts with `price_`)
4. Add it to `.env.local`:

```bash
STRIPE_PREMIUM_PRICE_ID=price_your_price_id_here
```

---

## Step 4: Set Up Webhooks

Webhooks notify your app when subscription events occur (payments, cancellations, etc.)

### Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - **Development:** Use **Stripe CLI** (see below)
   - **Production:** `https://yourdomain.com/api/stripe/webhook`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**

### Get Webhook Signing Secret

1. After creating the endpoint, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add it to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

---

## Step 5: Testing with Stripe CLI (Development)

For local development, use the Stripe CLI to forward webhook events.

### Install Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Other platforms:** https://stripe.com/docs/stripe-cli

### Login to Stripe

```bash
stripe login
```

### Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret starting with `whsec_`. Add it to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Keep this terminal window open while developing!

---

## Step 6: Test the Integration

### Test Credit Cards

Stripe provides test cards for development:

| Card Number         | Scenario                    |
|---------------------|----------------------------|
| 4242 4242 4242 4242 | Successful payment         |
| 4000 0000 0000 0002 | Card declined              |
| 4000 0000 0000 9995 | Insufficient funds         |

- **Expiry:** Any future date (e.g., 12/34)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

### Test Flow

1. Start your dev server: `npm run dev`
2. Start Stripe CLI webhook forwarding (see Step 5)
3. Sign up for a new account at http://localhost:3000/signup
4. Go to http://localhost:3000/pricing
5. Click **Upgrade to Premium**
6. Complete checkout with test card `4242 4242 4242 4242`
7. You should be redirected to `/account?success=true`
8. Check your account page - should show "Premium Plan"

### Verify in Stripe Dashboard

1. Go to **Payments** → should see the test payment
2. Go to **Customers** → should see the new customer
3. Go to **Subscriptions** → should see active subscription

---

## Step 7: Configure Customer Portal

The Customer Portal lets users manage their subscriptions.

1. Go to **Settings** → **Billing** → **Customer portal**
2. Click **Activate test link**
3. Configure settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing information
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to view invoice history
4. Click **Save**

Test the portal by going to `/account` and clicking "Manage Subscription & Billing"

---

## Step 8: Apply Database Migration

Don't forget to apply the database migration for user profiles and subscriptions!

1. Open Supabase SQL Editor
2. Copy contents of `supabase-migration-stage9.sql`
3. Paste and run in SQL Editor
4. Verify tables were created:

```sql
SELECT * FROM user_profiles LIMIT 1;
SELECT * FROM usage_tracking LIMIT 1;
SELECT * FROM subscription_history LIMIT 1;
```

---

## Step 9: Production Setup

When you're ready to go live:

### Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Complete business verification (may take a few days)
3. Get your live API keys from **Developers** → **API keys**

### Update Environment Variables

Replace test keys with live keys in your production environment:

```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_PREMIUM_PRICE_ID=price_your_live_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

### Create Live Webhook

1. In **Live mode**, go to **Developers** → **Webhooks**
2. Add endpoint with your production URL
3. Select the same events as before
4. Update `STRIPE_WEBHOOK_SECRET` with the new signing secret

### Test Production Flow

1. Use a real credit card (you can cancel immediately after)
2. Complete the full signup → upgrade → manage flow
3. Verify webhooks are being received
4. Check that database is updating correctly

---

## Environment Variables Summary

Add all of these to your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_or_sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_pk_live_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Existing variables (from previous stages)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-...
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=apify/website-content-crawler
RESEND_API_KEY=re_...
CONTACT_EMAIL=your-email@example.com
```

---

## Troubleshooting

### "Invalid API key provided"
- ✅ Check that your `.env.local` has the correct `STRIPE_SECRET_KEY`
- ✅ Make sure you're using the right mode (test vs live)
- ✅ Restart your dev server after changing env variables

### Webhooks not working
- ✅ Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- ✅ For local dev, make sure Stripe CLI is running (`stripe listen`)
- ✅ Check webhook signature matches your endpoint
- ✅ Look for webhook errors in Stripe Dashboard → Developers → Webhooks

### "No such price"
- ✅ Verify `STRIPE_PREMIUM_PRICE_ID` is correct
- ✅ Make sure the price exists in the same mode (test/live)
- ✅ Check that the price is active

### Customer portal not working
- ✅ Activate the customer portal in Stripe Dashboard
- ✅ Verify user has `stripe_customer_id` in database
- ✅ Check that user has an active subscription

### Subscription not updating in database
- ✅ Check webhook is being received (look at server logs)
- ✅ Verify `userId` is in subscription metadata
- ✅ Check for errors in webhook handler logs
- ✅ Run database migration if tables don't exist

---

## Pricing Configuration

Current pricing tiers:

### Free Tier
- **Cost:** $0/month
- **Tokens:** 10,000/month (~25-30 questions)
- **Features:** Basic chatbot access, email updates

### Premium Tier
- **Cost:** $9.99/month
- **Tokens:** Unlimited
- **Features:** Unlimited queries, priority support, advanced features

To change pricing:
1. Update `PRICING` in `src/lib/stripe.ts`
2. Create new price in Stripe Dashboard
3. Update `STRIPE_PREMIUM_PRICE_ID` in `.env.local`
4. Update UI text in `/pricing` page

---

## Security Best Practices

1. **Never commit secrets** to git
2. **Use webhook signatures** to verify authenticity
3. **Validate all webhook data** before processing
4. **Use test mode** for development
5. **Enable Stripe Radar** to prevent fraud
6. **Monitor failed payments** and retry logic
7. **Set up alerts** for unusual activity

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Monthly Recurring Revenue (MRR)**
   - Dashboard → Home (Stripe)

2. **Conversion Rate**
   - Free signups → Premium upgrades

3. **Churn Rate**
   - Cancelled subscriptions / total subscriptions

4. **Usage Stats**
   - Query Supabase: `SELECT * FROM usage_tracking`

5. **Failed Payments**
   - Dashboard → Payments → Failed (Stripe)

---

## Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Webhook Testing:** https://stripe.com/docs/webhooks/test

---

## Quick Start Checklist

- [ ] Created Stripe account
- [ ] Got API keys (test mode)
- [ ] Added keys to `.env.local`
- [ ] Created Premium product & price
- [ ] Added price ID to `.env.local`
- [ ] Set up webhook endpoint
- [ ] Added webhook secret to `.env.local`
- [ ] Installed Stripe CLI (for development)
- [ ] Applied database migration (`supabase-migration-stage9.sql`)
- [ ] Restarted dev server
- [ ] Tested signup flow
- [ ] Tested upgrade to Premium
- [ ] Tested customer portal
- [ ] Verified webhooks are working
- [ ] Verified database updates

---

**You're all set!** Users can now sign up, upgrade to Premium, and manage their subscriptions. 🎉

For production deployment, remember to:
1. Switch to live mode in Stripe
2. Update environment variables with live keys
3. Create production webhook endpoint
4. Complete Stripe business verification

---

**Questions?** Check the Stripe documentation or contact support.

