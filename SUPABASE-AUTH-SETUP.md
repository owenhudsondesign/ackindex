# 🔐 Supabase Authentication Setup Guide

This guide will help you set up authentication for the AckIndex admin panel.

---

## Quick Start (5 minutes)

### 1. Create Supabase Account & Project

1. Go to https://app.supabase.com
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name:** `ackindex`
   - **Database Password:** (generate and save securely)
   - **Region:** Choose closest to you (e.g., `us-east-1`)
5. Click **"Create new project"** (takes ~2 minutes)

---

### 2. Get Your API Keys

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"API"** in the left menu
3. Copy the following values:

```
Project URL:          https://xxxxx.supabase.co
anon/public key:      eyJhbGc...
service_role key:     eyJhbGc... (⚠️ Keep this secret!)
```

---

### 3. Add Keys to Your Project

1. Open your `.env.local` file
2. Replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file
4. Restart your dev server: `npm run dev`

---

### 4. Create Your Admin User

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **"Add User"** (green button)
3. Choose **"Create new user"**
4. Fill in:
   - **Email:** `admin@yourdomain.com`
   - **Password:** (create a strong password)
   - **Auto Confirm User:** ✅ Check this
5. Click **"Create user"**

---

### 5. Test Your Setup

1. Visit: http://localhost:3000/admin
2. You should be redirected to the login page
3. Enter your admin email and password
4. Click "Sign In"
5. ✅ You should now see the admin dashboard!

---

## Detailed Configuration

### Email Authentication Settings

By default, Supabase requires email confirmation. For admin users, you can:

**Option 1: Auto-confirm (recommended for development)**
- When creating a user, check ✅ "Auto Confirm User"

**Option 2: Disable email confirmation (not recommended for production)**
1. Go to **Authentication** → **Providers**
2. Click **Email** provider
3. Disable "Confirm email"
4. Save

**Option 3: Use magic links (for production)**
1. Keep email confirmation enabled
2. Configure your email templates in **Authentication** → **Email Templates**
3. Users will receive a confirmation email

---

### Creating Additional Admin Users

To create more admin accounts:

1. Go to **Authentication** → **Users**
2. Click **"Add User"**
3. Fill in email and password
4. Check "Auto Confirm User"
5. Click "Create user"

**Note:** There's no separate "admin" role system in this app. Anyone with a Supabase account can access the admin panel. For production, you should add Role-Based Access Control (RBAC) in a future stage.

---

### Custom Email Templates

To customize the email templates (confirmation, password reset):

1. Go to **Authentication** → **Email Templates**
2. Edit the templates for:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password
3. Use these variables in your templates:
   - `{{ .ConfirmationURL }}`
   - `{{ .Token }}`
   - `{{ .SiteURL }}`

---

## Security Best Practices

### Environment Variables

**Never commit these to git:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (has full database access)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (safe to expose)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose)

### Service Role Key

The service role key bypasses Row Level Security (RLS). Only use it in:
- Server-side code
- API routes
- Never in client-side code

### Rate Limiting

Supabase includes rate limiting by default:
- 30 requests per second per IP for auth endpoints
- 200 requests per second for other endpoints

For production, consider adding additional rate limiting.

---

## Troubleshooting

### "Invalid credentials" error
- ✅ Check email and password are correct
- ✅ Ensure user is confirmed (check "Auto Confirm User" when creating)
- ✅ Verify you're using the correct Supabase project

### "Failed to fetch" error
- ✅ Check your Supabase project is running (green status in dashboard)
- ✅ Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- ✅ Check your internet connection

### Redirects not working
- ✅ Make sure `src/middleware.ts` exists
- ✅ Restart your dev server
- ✅ Clear browser cookies and try again

### Can't access Supabase dashboard
- ✅ Check your internet connection
- ✅ Try logging out and back in to Supabase
- ✅ Try a different browser

---

## Advanced: Row Level Security (Future)

For production, you should add Row Level Security (RLS) policies to your Supabase tables. This will be covered in Stage 7 when we create the database schema for documents.

Example policy (for future reference):
```sql
-- Only authenticated users can insert documents
CREATE POLICY "Authenticated users can insert documents"
ON documents
FOR INSERT
TO authenticated
USING (true);
```

---

## Testing Your Setup

Run through this checklist:

- [ ] Created Supabase project
- [ ] Got API keys and added to `.env.local`
- [ ] Created admin user in Supabase
- [ ] Can visit `/admin` and get redirected to login
- [ ] Can successfully log in
- [ ] See admin dashboard after login
- [ ] Can sign out successfully
- [ ] Redirected to login after sign out

---

## Next Steps

✅ **Authentication is now set up!**

With authentication working, you're ready to:
1. Test the upload forms (they queue jobs for Stage 7)
2. Begin Stage 7 to implement actual scraping and parsing
3. Add more admin users as needed

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

**Questions?** Check the main STAGE-6-COMPLETE.md file or the Supabase documentation.
