/**
 * Resend Email Service
 *
 * Handles sending newsletters via Resend API
 */

import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'AckIndex <no-reply@mail.ackindex.com>';

interface Subscriber {
  email: string;
  preferred_language: string;
}

interface NewsletterContent {
  id: string;
  subject: string;
  subject_es?: string | null;
  subject_pt?: string | null;
  html_content: string;
  html_content_es?: string | null;
  html_content_pt?: string | null;
  plain_text_content?: string | null;
  plain_text_content_es?: string | null;
  plain_text_content_pt?: string | null;
}

/**
 * Get language-specific content for a subscriber
 */
function getLocalizedContent(
  newsletter: NewsletterContent,
  language: string
): { subject: string; html: string; text: string | null } {
  switch (language) {
    case 'es':
      return {
        subject: newsletter.subject_es || newsletter.subject,
        html: newsletter.html_content_es || newsletter.html_content,
        text: newsletter.plain_text_content_es ?? newsletter.plain_text_content ?? null,
      };
    case 'pt':
      return {
        subject: newsletter.subject_pt || newsletter.subject,
        html: newsletter.html_content_pt || newsletter.html_content,
        text: newsletter.plain_text_content_pt ?? newsletter.plain_text_content ?? null,
      };
    default:
      return {
        subject: newsletter.subject,
        html: newsletter.html_content,
        text: newsletter.plain_text_content ?? null,
      };
  }
}

/**
 * Send newsletter to all active subscribers
 */
export async function sendNewsletterToSubscribers(
  newsletter: NewsletterContent
): Promise<{ sent: number; failed: number; errors: string[] }> {
  // Get all active subscribers
  const { data: subscribers, error: subError } = await supabaseAdmin
    .from('email_subscribers')
    .select('email, preferred_language')
    .eq('is_subscribed', true);

  if (subError) {
    logger.error({ error: subError }, '[Resend] Failed to fetch subscribers');
    throw new Error('Failed to fetch subscribers');
  }

  if (!subscribers || subscribers.length === 0) {
    logger.info('[Resend] No active subscribers found');
    return { sent: 0, failed: 0, errors: [] };
  }

  logger.info({ count: subscribers.length }, '[Resend] Sending newsletter to subscribers');

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Send to each subscriber with their preferred language
  for (const subscriber of subscribers as Subscriber[]) {
    const content = getLocalizedContent(newsletter, subscriber.preferred_language || 'en');

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: subscriber.email,
        subject: content.subject,
        html: content.html,
        text: content.text || undefined,
      });

      if (error) {
        logger.error({ error, email: subscriber.email }, '[Resend] Failed to send email');
        errors.push(`${subscriber.email}: ${error.message}`);
        failed++;
      } else {
        sent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: err, email: subscriber.email }, '[Resend] Exception sending email');
      errors.push(`${subscriber.email}: ${message}`);
      failed++;
    }
  }

  logger.info({ sent, failed }, '[Resend] Newsletter send complete');

  return { sent, failed, errors };
}

/**
 * Send a test email to a specific address
 */
export async function sendTestEmail(
  to: string,
  newsletter: NewsletterContent,
  language: string = 'en'
): Promise<{ success: boolean; error?: string }> {
  const content = getLocalizedContent(newsletter, language);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[TEST] ${content.subject}`,
      html: content.html,
      text: content.text || undefined,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
