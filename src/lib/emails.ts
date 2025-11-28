/**
 * Email Templates and Sending via Resend
 */

import { Resend } from 'resend';
import logger from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'AckIndex <no-reply@mail.ackindex.com>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ackindex.com';

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  to: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  const firstName = fullName?.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #2e90c6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Welcome to AckIndex!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thanks for signing up for AckIndex! You now have access to Nantucket's most comprehensive town meeting archive.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Here's what you can do:</strong>
              </p>
              <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li>Ask questions about any town meeting topic</li>
                <li>Search across years of meeting transcripts</li>
                <li>Get AI-powered summaries with source citations</li>
                <li>Stay informed with weekly newsletter updates</li>
              </ul>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Try asking something like: <em>"What was discussed about housing at the last Select Board meeting?"</em>
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #2e90c6;">
                    <a href="${BASE_URL}" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px;">
                      Start Exploring →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Questions? Just reply to this email - we're happy to help!
              </p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px;">
                <a href="${BASE_URL}/account" style="color: #9ca3af;">Manage preferences</a> ·
                <a href="${BASE_URL}" style="color: #9ca3af;">AckIndex.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to AckIndex!',
      html,
    });

    if (error) {
      logger.error({ error, to }, '[Email] Failed to send welcome email');
      return { success: false, error: error.message };
    }

    logger.info({ to }, '[Email] Welcome email sent');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, to }, '[Email] Exception sending welcome email');
    return { success: false, error: message };
  }
}

/**
 * Send 7-day follow-up email
 */
export async function sendFollowUpEmail(
  to: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  const firstName = fullName?.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #2e90c6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                How's it going?
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                It's been a week since you joined AckIndex. We wanted to check in and make sure you're finding what you need!
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Popular questions from the community:</strong>
              </p>
              <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li>"What are the latest updates on short-term rentals?"</li>
                <li>"When is the next town meeting?"</li>
                <li>"What happened with the airport expansion?"</li>
                <li>"What's the status of the sewer project?"</li>
              </ul>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Have a question about something specific? Just ask - our AI has access to years of meeting transcripts and can find exactly what you're looking for.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #2e90c6;">
                    <a href="${BASE_URL}" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px;">
                      Ask a Question →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Questions or feedback? Just reply to this email!
              </p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px;">
                <a href="${BASE_URL}/account" style="color: #9ca3af;">Manage preferences</a> ·
                <a href="${BASE_URL}" style="color: #9ca3af;">AckIndex.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'How are you liking AckIndex?',
      html,
    });

    if (error) {
      logger.error({ error, to }, '[Email] Failed to send follow-up email');
      return { success: false, error: error.message };
    }

    logger.info({ to }, '[Email] Follow-up email sent');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, to }, '[Email] Exception sending follow-up email');
    return { success: false, error: message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #2e90c6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Reset Your Password
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your password for your AckIndex account.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Click the button below to set a new password. This link will expire in 1 hour.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #2e90c6;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If you didn't request this, you can safely ignore this email. Your password won't be changed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="${BASE_URL}" style="color: #9ca3af;">AckIndex.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset your AckIndex password',
      html,
    });

    if (error) {
      logger.error({ error, to }, '[Email] Failed to send password reset email');
      return { success: false, error: error.message };
    }

    logger.info({ to }, '[Email] Password reset email sent');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, to }, '[Email] Exception sending password reset email');
    return { success: false, error: message };
  }
}
