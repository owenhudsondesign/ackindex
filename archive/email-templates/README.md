# Supabase Email Templates

These are branded HTML email templates to replace the default Supabase auth emails.

## How to Apply

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. For each template type, copy the HTML from the corresponding file and paste it into the "Body" field

## Template Files

| Supabase Template | File | Subject Line |
|-------------------|------|--------------|
| Confirm signup | `supabase-confirm-signup.html` | Confirm your AckIndex account |
| Reset password | `supabase-reset-password.html` | Reset your AckIndex password |
| Magic link | `supabase-magic-link.html` | Sign in to AckIndex |
| Change email | `supabase-change-email.html` | Confirm your email change |
| Invite user | `supabase-invite-user.html` | You're invited to AckIndex |

## Template Variables

These templates use Supabase's Go template syntax:
- `{{ .ConfirmationURL }}` - The confirmation/action link

## Optional: Custom SMTP with Resend

For even more control, you can configure Resend as your SMTP provider:

1. In Resend, go to **Settings** → **SMTP**
2. Copy the SMTP credentials
3. In Supabase, go to **Project Settings** → **Auth** → **SMTP Settings**
4. Enable custom SMTP and enter:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: Your Resend API key
   - Sender email: `no-reply@mail.ackindex.com`
   - Sender name: `AckIndex`

This routes all auth emails through Resend for better deliverability and tracking.
