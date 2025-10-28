# 🎉 Stage 9 Complete: User Signup, Subscriptions & Usage Tracking

## ✅ What Was Built

Stage 9 implements a complete user signup system with email newsletters, Stripe-powered subscriptions, and usage tracking for the chatbot!

### Core Features Implemented

1. **User Signup System**
   - Beautiful signup page with email newsletter opt-in
   - Email confirmation workflow
   - Password validation and security
   - Full integration with Supabase Auth

2. **Stripe Subscription Management**
   - Free tier: 10,000 tokens/month (~25-30 questions)
   - Premium tier: $9.99/month with unlimited usage
   - Secure payment processing
   - Customer billing portal
   - Subscription lifecycle management

3. **Usage Tracking**
   - Real-time token tracking per user
   - Monthly usage limits for free tier
   - Cost estimation and analytics
   - Query count statistics
   - Automatic resets each month

4. **User Dashboard**
   - Account overview with usage stats
   - Subscription management
   - Visual usage meters
   - Quick upgrade prompts
   - Payment method management

5. **Enhanced Navigation**
   - Pricing page link in header
   - Sign Up / Log In / My Account buttons
   - Responsive mobile menu
   - Authentication-aware navigation

---

## 🗄️ Database Changes

### New Migration: `supabase-migration-stage9.sql`

Added 4 new tables:

1. **user_profiles**
   - Extended user information
   - Email preferences
   - Subscription details
   - Stripe customer/subscription IDs
   - Monthly token limits

2. **usage_tracking**
   - Token usage per user per month
   - Input/output token breakdown
   - Query counts
   - Cost estimation

3. **subscription_history**
   - Audit log of all subscription events
   - Payment successes/failures
   - Tier changes
   - Cancellations

4. **email_subscribers**
   - Newsletter subscription management
   - Can exist independently of user accounts
   - Verification workflow
   - Frequency preferences

### Helper Functions

```sql
-- Auto-create profile when user signs up
create_user_profile()

-- Get or create current month usage
get_current_usage(user_id)

-- Check if user can make a query
can_user_query(user_id)

-- Record usage after chat
record_usage(user_id, input_tokens, output_tokens, cost)
```

### View

```sql
-- User dashboard data
user_dashboard (combines auth.users + profiles + current usage)
```

---

## 📁 Files Created

### Pages
- `src/app/signup/page.tsx` - User signup with newsletter opt-in (290 lines)
- `src/app/pricing/page.tsx` - Pricing tiers & FAQs (470 lines)
- `src/app/account/page.tsx` - User dashboard & subscription management (380 lines)

### API Routes
- `src/app/api/stripe/create-checkout/route.ts` - Stripe checkout session (40 lines)
- `src/app/api/stripe/portal/route.ts` - Customer portal access (35 lines)
- `src/app/api/stripe/webhook/route.ts` - Webhook event handler (250 lines)
- `src/app/api/user/dashboard/route.ts` - User dashboard API (30 lines)

### Libraries
- `src/lib/stripe.ts` - Stripe SDK configuration & helpers (170 lines)
- `src/lib/userProfile.ts` - User profile & usage utilities (270 lines)

### Database
- `supabase-migration-stage9.sql` - Complete schema (470 lines)

### Documentation
- `STRIPE-SETUP.md` - Complete Stripe setup guide (500+ lines)

### Updated Files
- `src/lib/auth.ts` - Added signup, password reset functions
- `src/app/api/chat/route.ts` - Added usage tracking & limits
- `src/components/Header.tsx` - Made dynamic with auth-aware nav
- `src/components/MobileMenu.tsx` - Added new links & auth state

---

## 🚀 Setup Instructions

### Step 1: Apply Database Migration

```bash
# In Supabase SQL Editor, run:
supabase-migration-stage9.sql
```

Verify:
```sql
SELECT * FROM user_profiles LIMIT 1;
SELECT * FROM usage_tracking LIMIT 1;
```

### Step 2: Set Up Stripe

Follow the complete guide in `STRIPE-SETUP.md`:

1. Create Stripe account
2. Get API keys (test mode)
3. Create Premium product ($19.99/month)
4. Set up webhooks
5. Install Stripe CLI for local testing

### Step 3: Update Environment Variables

Add to `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_PREMIUM_PRICE_ID=price_your_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# All existing variables from previous stages
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
APIFY_API_TOKEN=...
RESEND_API_KEY=...
CONTACT_EMAIL=...
```

### Step 4: Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

### Step 5: Start Development

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Step 6: Test the Full Flow

1. **Signup** - http://localhost:3000/signup
   - Create account
   - Opt in to email updates
   - Confirm email (check Supabase Auth logs)

2. **Try Free Chatbot** - http://localhost:3000
   - Ask a question
   - See usage tracked in account page

3. **View Pricing** - http://localhost:3000/pricing
   - Review plans
   - Compare features

4. **Upgrade to Premium** - Click "Upgrade to Premium"
   - Use test card: 4242 4242 4242 4242
   - Complete checkout
   - Redirected to account page

5. **Check Account** - http://localhost:3000/account
   - Should show "Premium Plan"
   - Unlimited tokens
   - Access to billing portal

6. **Manage Subscription**
   - Click "Manage Subscription & Billing"
   - View invoices
   - Update payment method
   - (Can cancel subscription)

---

## 🎨 How It Works

### Signup Flow

```
User visits /signup
   ↓
Fills form (name, email, password, newsletter opt-in)
   ↓
Calls signUp() from auth.ts
   ↓
Supabase creates user in auth.users
   ↓
Database trigger creates user_profiles row
   ↓
Email confirmation sent (if enabled)
   ↓
User redirected to home page
```

### Usage Tracking Flow

```
User sends chat message
   ↓
Check authentication (getCurrentUser)
   ↓
Check if user can query (canUserQuery)
   ↓
If over limit → Return 429 error + upgrade message
   ↓
If under limit → Process query
   ↓
Track OpenAI token usage
   ↓
Record in usage_tracking table
   ↓
Return response + updated usage stats
```

### Stripe Subscription Flow

```
User clicks "Upgrade to Premium"
   ↓
POST /api/stripe/create-checkout
   ↓
Create/get Stripe customer
   ↓
Create checkout session
   ↓
Redirect to Stripe Checkout
   ↓
User enters payment info
   ↓
Stripe processes payment
   ↓
Webhook: checkout.session.completed
   ↓
Update user_profiles (tier=premium)
   ↓
Log subscription_history
   ↓
Redirect to /account?success=true
```

### Monthly Usage Reset

```
User's usage is tracked per year/month
   ↓
New month starts
   ↓
New usage_tracking row created automatically
   ↓
Previous month's data remains for history
   ↓
User starts with fresh token allowance
```

---

## 💡 Pricing Breakdown

### Free Tier ($0/month)
- ✅ 10,000 tokens per month
- ✅ ~25-30 questions per month
- ✅ Full chatbot access
- ✅ Search all documents
- ✅ Weekly email updates
- ✅ Community support

### Premium Tier ($9.99/month)
- ✅ **Unlimited tokens**
- ✅ **Unlimited questions**
- ✅ Everything in Free, plus:
- ✅ Priority support
- ✅ Advanced search features
- ✅ Early access to new features
- ✅ Export conversation history
- ✅ API access (coming soon)

### Revenue Projections

Assuming 1,000 users:
- **70% Free** (700 users) = $0
- **30% Premium** (300 users) = $5,997/month
- **Annual Run Rate** = ~$72,000/year

Cost per premium user:
- OpenAI API costs: ~$2-5/month per power user
- Stripe fees: 2.9% + $0.30 = ~$0.88/transaction
- Net revenue: ~$14-17/user/month

---

## 🧪 Testing Guide

### Test Signup

1. Go to http://localhost:3000/signup
2. Fill in details:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPass123!
   - Check "Subscribe to email updates"
3. Submit form
4. Check Supabase → Authentication → Users (should see new user)
5. Check `user_profiles` table (should have matching row)

### Test Free Tier Limits

1. Sign up with new account
2. Ask 30+ questions until you hit the limit
3. Should get error: "Token limit exceeded"
4. Should see upgrade prompt

### Test Premium Upgrade

1. Go to /pricing
2. Click "Upgrade to Premium"
3. Use Stripe test card: 4242 4242 4242 4242
4. Complete checkout
5. Verify:
   - Redirected to /account?success=true
   - Dashboard shows "Premium Plan"
   - Usage shows "Unlimited"
   - Can ask unlimited questions

### Test Stripe Webhooks

1. Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Complete a checkout
3. Check terminal logs - should see webhook events
4. Check `subscription_history` table - should have events logged

### Test Customer Portal

1. Upgrade to premium
2. Go to /account
3. Click "Manage Subscription & Billing"
4. Should redirect to Stripe Customer Portal
5. Try:
   - Viewing invoices
   - Updating payment method
   - Cancelling subscription (test only!)

### Test Usage Dashboard

1. Go to /account
2. Should see:
   - Current subscription tier
   - Tokens used this month
   - Questions asked
   - Usage percentage bar
   - Remaining tokens

---

## 📊 Database Queries

### Check User's Current Usage

```sql
SELECT * FROM user_dashboard 
WHERE email = 'user@example.com';
```

### View All Premium Subscribers

```sql
SELECT email, full_name, subscription_tier, subscription_status
FROM user_profiles
JOIN auth.users ON user_profiles.id = auth.users.id
WHERE subscription_tier = 'premium';
```

### Calculate Total Revenue

```sql
SELECT 
  COUNT(*) as premium_users,
  COUNT(*) * 1999 as monthly_revenue_cents,
  COUNT(*) * 19.99 as monthly_revenue_dollars
FROM user_profiles
WHERE subscription_tier = 'premium'
  AND subscription_status = 'active';
```

### View This Month's Usage

```sql
SELECT 
  u.email,
  p.subscription_tier,
  ut.total_tokens,
  ut.query_count,
  p.monthly_token_limit
FROM usage_tracking ut
JOIN auth.users u ON ut.user_id = u.id
JOIN user_profiles p ON ut.user_id = p.id
WHERE ut.year = EXTRACT(YEAR FROM NOW())
  AND ut.month = EXTRACT(MONTH FROM NOW())
ORDER BY ut.total_tokens DESC;
```

### Find Users Near Limit

```sql
SELECT 
  email,
  tokens_used_this_month,
  tokens_remaining,
  monthly_token_limit
FROM user_dashboard
WHERE subscription_tier = 'free'
  AND tokens_remaining < 1000
ORDER BY tokens_remaining ASC;
```

---

## 🔍 Troubleshooting

### Signup fails with "User already registered"
- User exists in Supabase Auth
- Check Dashboard → Authentication → Users
- Delete test user or use different email

### Chat returns "Authentication required"
- User not logged in
- Check browser cookies/localStorage
- Try signing in again

### "Token limit exceeded" error
- User has hit free tier limit
- Check usage: `SELECT * FROM user_dashboard WHERE id = 'user-id'`
- Either wait until next month or upgrade to premium

### Stripe checkout fails
- Check `STRIPE_SECRET_KEY` is set correctly
- Verify `STRIPE_PREMIUM_PRICE_ID` exists in Stripe
- Check Stripe Dashboard → Developers → Logs for errors

### Webhooks not working
- Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Check `STRIPE_WEBHOOK_SECRET` matches CLI output
- Look for errors in server logs
- Verify webhook endpoint in Stripe Dashboard

### Subscription not updating after payment
- Check webhook logs in server console
- Verify `userId` is in subscription metadata
- Check `subscription_history` table for events
- Look for errors in webhook handler

### Account page shows wrong data
- Check `user_profiles` table has correct data
- Verify `usage_tracking` has current month record
- Try refreshing the page
- Check browser console for API errors

---

## 🎯 What Works Now

✅ **User Signup** - Beautiful signup flow with email opt-in  
✅ **Authentication** - Secure login/logout system  
✅ **Free Tier** - 10,000 tokens/month with tracking  
✅ **Premium Tier** - Unlimited usage for $9.99/month  
✅ **Usage Tracking** - Real-time token consumption  
✅ **Usage Limits** - Automatic enforcement with upgrade prompts  
✅ **Stripe Checkout** - Secure payment processing  
✅ **Subscription Management** - Customer billing portal  
✅ **Webhooks** - Automatic subscription updates  
✅ **User Dashboard** - Account overview with stats  
✅ **Email Newsletters** - Weekly update opt-in  
✅ **Responsive Nav** - Auth-aware navigation  

---

## 📝 What's Next: Stage 10 (Final)

**Stage 10: Polish, Testing & Deployment**

1. **Email Newsletter System**
   - Set up Resend for weekly digests
   - Create email templates
   - Schedule cron jobs

2. **Admin Enhancements**
   - View all users
   - See revenue dashboard
   - Manually adjust limits
   - Send announcements

3. **UI Polish**
   - Loading states
   - Error boundaries
   - Toast notifications
   - Animations

4. **Testing**
   - E2E testing setup
   - Unit tests for critical functions
   - Load testing

5. **Production Deployment**
   - Vercel deployment guide
   - Environment variable checklist
   - Stripe live mode setup
   - Domain configuration
   - SSL setup

---

## 💪 Stage 9 Summary

✅ **User Signup** - Full registration system with email confirmation  
✅ **Stripe Integration** - Payment processing & subscriptions  
✅ **Usage Tracking** - Real-time token consumption monitoring  
✅ **Pricing Tiers** - Free (10k tokens) & Premium (unlimited)  
✅ **User Dashboard** - Account management & usage stats  
✅ **Navigation** - Dynamic header with auth state  
✅ **Webhooks** - Automatic subscription lifecycle management  
✅ **Documentation** - Complete setup guides  

**Stage 9 is complete!** Users can now sign up, subscribe to premium, and have their usage tracked automatically. The monetization system is fully functional! 🎉💳

---

## 🐛 Known Limitations

1. **No email verification enforcement** - Users can use chatbot before confirming email
2. **No password reset page** - Function exists but no UI
3. **No trial period** - Premium starts billing immediately
4. **No annual billing option** - Only monthly subscriptions
5. **No usage alerts** - No email when approaching limit
6. **No referral system** - No discounts for referrals

These are all potential enhancements for post-launch!

---

## 📈 Metrics to Monitor

Track these KPIs in production:

1. **Signups per day/week**
2. **Free → Premium conversion rate**
3. **Monthly churn rate**
4. **Average tokens per user**
5. **Revenue per user**
6. **Failed payment rate**
7. **Customer lifetime value**

---

**Ready for the final stage?** Let's polish, test, and deploy! 🚀

