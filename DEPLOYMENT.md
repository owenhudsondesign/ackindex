# AckIndex Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] Supabase project created
- [ ] Database tables created (run `supabase-setup.sql`)
- [ ] Admin user created in Supabase Auth
- [ ] Storage bucket configured
- [ ] API keys obtained (Anthropic or OpenAI)
- [ ] Environment variables documented
- [ ] Code pushed to GitHub

## 🚀 Deploy to Vercel (Recommended)

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Framework Preset: **Next.js** (auto-detected)

### Step 2: Configure Environment Variables

Add these in Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Important**: Mark `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as sensitive.

### Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Your site will be live at `your-project.vercel.app`

### Step 4: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `ackindex.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

## 🔧 Post-Deployment Configuration

### 1. Test Upload Functionality

1. Visit `your-domain.com/admin`
2. Sign in with admin credentials
3. Try uploading a sample PDF
4. Verify it appears on the home page

### 2. Supabase CORS Configuration

If you encounter CORS issues:

1. Supabase Dashboard → Settings → API
2. Add your Vercel domain to allowed origins
3. Example: `https://your-project.vercel.app`

### 3. Rate Limiting (Optional)

For production, consider adding rate limiting:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
});
```

## 🔒 Security Best Practices

### 1. Environment Variables

✅ **DO**:
- Store all secrets in environment variables
- Use different keys for dev/staging/prod
- Rotate API keys periodically

❌ **DON'T**:
- Commit `.env.local` to git
- Share API keys in code or messages
- Use production keys in development

### 2. Supabase Security

- Enable RLS on all tables
- Use service role key only in API routes
- Review auth policies regularly
- Monitor usage in Supabase dashboard

### 3. File Upload Security

- Validate file types (PDF only)
- Limit file size (10MB max)
- Scan for malware (consider Cloudflare workers)
- Rate limit uploads per IP

## 📊 Monitoring

### Vercel Analytics

Enable in Project Settings → Analytics:
- Real-time traffic
- Performance metrics
- Error tracking

### Supabase Monitoring

Check regularly:
- Database size
- API usage
- Auth activity
- Storage usage

### Set Up Alerts

1. **Vercel**: Configure budget alerts
2. **Supabase**: Set up usage notifications
3. **API**: Monitor rate limits

## 🔄 Updates and Maintenance

### Automatic Deployments

Vercel auto-deploys when you push to main branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel automatically deploys
```

### Manual Deployment

```bash
npm run build
vercel --prod
```

### Database Migrations

When updating schema:

1. Test changes in development
2. Backup production database
3. Run SQL in Supabase SQL Editor
4. Test thoroughly before announcing

## 🐛 Troubleshooting

### Build Fails

**Issue**: TypeScript errors
```bash
# Fix locally first
npm run build
# Fix all errors, then push
```

**Issue**: Missing environment variables
- Check all vars are set in Vercel
- Verify no typos in variable names

### Upload Not Working

**Issue**: "Failed to upload"
- Check Supabase storage bucket exists
- Verify storage policies are correct
- Check API key is valid

**Issue**: "Could not parse PDF"
- Ensure PDF is not password-protected
- Try a simpler PDF first
- Check pdf-parse is installed

### Database Errors

**Issue**: "Failed to fetch entries"
- Verify RLS policies allow public read
- Check Supabase connection string
- Test query in Supabase SQL editor

## 🌐 Domain Setup

### Using Vercel Domain

1. Project Settings → Domains
2. Add domain
3. Update DNS records at your registrar:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Using Custom DNS

For `ackindex.com`:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## 📈 Performance Optimization

### 1. Image Optimization

If adding images later, use Next.js Image:

```tsx
import Image from 'next/image';
<Image src="/logo.png" width={100} height={100} alt="Logo" />
```

### 2. Database Optimization

- Add indexes on frequently queried columns
- Use `select` to limit returned fields
- Implement pagination for large datasets

### 3. Caching

Enable edge caching for static content:

```typescript
// app/api/entries/route.ts
export const revalidate = 60; // Revalidate every 60 seconds
```

## 🎯 Launch Checklist

Before announcing to the public:

- [ ] Test all features in production
- [ ] Verify admin login works
- [ ] Upload at least 3-5 sample documents
- [ ] Test on mobile devices
- [ ] Check performance (Lighthouse score)
- [ ] Set up monitoring and alerts
- [ ] Prepare announcement/blog post
- [ ] Create social media graphics
- [ ] Document how citizens can request updates

## 🎉 You're Live!

Your civic intelligence dashboard is now serving Nantucket! 

Monitor it regularly, respond to feedback, and keep the data flowing.

For questions or issues, check:
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
