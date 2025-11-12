# Buffer Setup Guide

AckIndex automatically generates social media posts and queues them in Buffer for your approval before publishing.

## Why Buffer?

- ✅ **Simple setup** (5 minutes)
- ✅ **Auto-approval workflow** built-in
- ✅ **Mobile app** for reviewing posts on the go
- ✅ **Scheduling** for optimal posting times
- ✅ **Analytics** to track engagement
- ✅ **Only $6/month** for Instagram + Facebook

---

## Step 1: Create Buffer Account

1. Go to https://buffer.com/pricing
2. Choose **"Essentials"** plan ($6/month per channel)
   - Or start with **free trial** (1 channel)
3. Sign up with email

---

## Step 2: Connect Your Social Media Accounts

1. In Buffer, click **"Connect Account"**
2. Add **Instagram Business** account
   - Must be Instagram Business (not Personal or Creator)
   - Will ask you to log in with Instagram
3. Add **Facebook Page**
   - Select your Nantucket page
   - Grant permissions

---

## Step 3: Get Buffer Access Token

1. Go to https://buffer.com/developers/apps
2. Click **"Create an App"**
3. Fill in:
   - **App Name**: "AckIndex"
   - **Description**: "Auto-generate social media posts for town meetings"
   - **Website**: https://ackindex.com
4. Click **"Create App"**
5. Copy the **Access Token** (long string starting with `1/`)

---

## Step 4: Get Profile IDs

**Option A: Use Buffer API Explorer**

1. Go to https://buffer.com/developers/api/profiles
2. Click **"Try it out"**
3. Paste your Access Token
4. Click **"Get Profiles"**
5. Find your Instagram and Facebook profiles in the response
6. Copy the `id` for each (e.g., `"5f9a2b3c4d5e6f7g8h9i0j1k"`)

**Option B: Use curl**

```bash
curl "https://api.bufferapp.com/1/profiles.json?access_token=YOUR_ACCESS_TOKEN"
```

Look for:
```json
[
  {
    "id": "abc123...",  // ← Instagram Profile ID
    "service": "instagram",
    "formatted_username": "@your_instagram"
  },
  {
    "id": "def456...",  // ← Facebook Profile ID
    "service": "facebook",
    "formatted_username": "Your Page Name"
  }
]
```

---

## Step 5: Add to Environment Variables

Add these to your `.env.local` file:

```env
# Buffer API Configuration
BUFFER_ACCESS_TOKEN=1/0a1b2c3d4e5f6g7h8i9j0k...  # From Step 3
BUFFER_INSTAGRAM_PROFILE_ID=abc123def456...       # Instagram ID from Step 4
BUFFER_FACEBOOK_PROFILE_ID=def456abc123...        # Facebook ID from Step 4
```

**Restart your dev server** after adding these!

---

## Step 6: Test It!

1. Upload a test video to AckIndex
2. Wait for processing to complete
3. Check your **Buffer dashboard** (https://buffer.com)
4. You should see 2 new posts in your queue:
   - 📸 Instagram post
   - 👥 Facebook post

---

## How It Works

### Automatic Workflow

```
Video uploaded → Transcribed → Blog post created → Social posts generated
                                                              ↓
                                      Posts queued in Buffer (pending approval)
                                                              ↓
                                      You review in Buffer dashboard/app
                                                              ↓
                                      Click "Approve" → Posts published!
```

### What Gets Generated

**Instagram Post:**
- Engaging caption with emojis
- Key meeting highlights
- Up to 30 hashtags
- YouTube thumbnail as image

**Facebook Post:**
- Professional summary
- Key decisions and votes
- Direct quotes from officials
- 5-8 hashtags
- YouTube thumbnail as image

---

## Buffer Dashboard Features

### Review Posts
- See full preview with image
- Edit caption before publishing
- Add/remove hashtags
- Change image (if needed)

### Scheduling
- **Post Now** - Publish immediately
- **Add to Queue** - Post at optimal time
- **Custom Schedule** - Pick exact date/time

### Analytics
- Likes, comments, shares
- Reach and impressions
- Click-through rates
- Best performing content

---

## Pricing

**Buffer Essentials:**
- $6/month per social channel
- For Instagram + Facebook: **$12/month**
- **14-day free trial** to test

**What you get:**
- Unlimited scheduled posts
- 1 year of post history
- Analytics and insights
- Mobile app
- Browser extension

---

## Troubleshooting

### "Buffer API error: 401"
- Your access token is invalid or expired
- Go to https://buffer.com/developers/apps
- Regenerate access token
- Update `.env.local`

### "Profile IDs not configured"
- Missing `BUFFER_INSTAGRAM_PROFILE_ID` or `BUFFER_FACEBOOK_PROFILE_ID`
- Follow Step 4 to get profile IDs
- Add to `.env.local`

### "Posts not appearing in Buffer"
- Check Buffer dashboard: https://buffer.com
- Check that accounts are connected
- Verify profile IDs are correct
- Check server logs for errors

### "Instagram/Facebook not showing in profiles"
- Make sure accounts are connected in Buffer
- Instagram must be Business account (not Personal)
- Facebook must be a Page (not personal profile)

---

## Alternative: Manual Posting

If you don't want to pay for Buffer, you can:

1. Check `/blog` page for auto-generated summaries
2. Manually copy content to Instagram/Facebook
3. Still get all the SEO benefits of blog posts

But Buffer saves you time and gives you scheduling + analytics! 🚀

---

## Support

- **Buffer Help**: https://support.buffer.com/
- **Buffer API Docs**: https://buffer.com/developers/api
- **AckIndex Issues**: https://github.com/owenhudsondesign/ackindex/issues
