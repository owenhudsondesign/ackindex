# Email Configuration Guide

## Setting Up Resend for Contact Form

AckIndex uses [Resend](https://resend.com) to send emails from the contact form.

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** in the sidebar
3. Click **Create API Key**
4. Give it a name (e.g., "AckIndex Production")
5. Copy the API key (it starts with `re_`)

### Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Configuration
RESEND_API_KEY=re_your_api_key_here

# Contact form recipient email
CONTACT_EMAIL=your-email@example.com
```

**Important Notes:**
- `RESEND_API_KEY`: Your Resend API key
- `CONTACT_EMAIL`: The email address that will receive contact form submissions

### Step 4: Domain Setup (Optional - For Production)

For production use, you should verify your own domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain name (e.g., `ackindex.com`)
4. Follow DNS verification instructions
5. Wait for verification (usually 5-10 minutes)

Once verified, update the `from` field in `/src/app/api/contact/route.ts`:

```typescript
from: 'AckIndex <noreply@yourdomain.com>',
```

### Step 5: Test the Form

1. Start your development server: `npm run dev`
2. Navigate to `/contact`
3. Fill out and submit the form
4. Check your email (and spam folder)

### Development Testing

For development, Resend provides a test domain (`onboarding@resend.dev`) that works immediately without domain verification. This is already configured in the code.

### Free Tier Limits

Resend's free tier includes:
- 100 emails per day
- 3,000 emails per month
- All features included

For higher volumes, upgrade to a paid plan.

---

## Alternative: SendGrid Setup

If you prefer SendGrid instead of Resend, follow these steps:

### Install SendGrid
```bash
npm install @sendgrid/mail
```

### Update API Route

Replace the content in `/src/app/api/contact/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  // ... validation code ...

  try {
    await sgMail.send({
      to: process.env.CONTACT_EMAIL,
      from: 'noreply@yourdomain.com', // Must be verified in SendGrid
      replyTo: sanitizedData.email,
      subject: `AckIndex Contact: ${sanitizedData.name}`,
      html: `<p>${sanitizedData.message}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
```

### Environment Variables for SendGrid
```bash
SENDGRID_API_KEY=SG.your_api_key_here
CONTACT_EMAIL=your-email@example.com
```

---

## Troubleshooting

### "Email service is not configured"
- Make sure `RESEND_API_KEY` is set in `.env.local`
- Restart your development server after adding env variables

### "Failed to send email"
- Check that your API key is correct
- Verify you haven't exceeded rate limits
- Check Resend dashboard for error logs

### Emails not arriving
- Check spam/junk folder
- Verify `CONTACT_EMAIL` is correct
- Check Resend dashboard delivery logs

### Development Mode Issues
- Make sure `.env.local` exists and has the variables
- Try `rm -rf .next && npm run dev` to clear cache

---

## Security Best Practices

1. **Never commit API keys** - Always use environment variables
2. **Rate limiting** - Consider adding rate limiting in production
3. **Input validation** - Already implemented in the code
4. **CAPTCHA** - Consider adding reCAPTCHA for production
5. **Email sanitization** - Already implemented in the code

---

## Production Checklist

- [ ] Verify your domain in Resend
- [ ] Update `from` email to use your domain
- [ ] Set up proper CONTACT_EMAIL
- [ ] Test form submission
- [ ] Add rate limiting (optional)
- [ ] Add CAPTCHA (optional)
- [ ] Monitor email delivery logs
- [ ] Set up email alerts for failures

---

## Support

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **SendGrid Docs**: https://docs.sendgrid.com

---

**You're all set!** The contact form will now send emails to your specified address. 📧✨
