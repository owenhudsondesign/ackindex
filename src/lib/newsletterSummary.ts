/**
 * Newsletter Summary Generation
 *
 * Generates weekly meeting summaries for email newsletters.
 * Uses Claude to create engaging, readable summaries from blog posts.
 */

import { supabaseAdmin } from './supabase';
import { generateClaudeResponse } from './anthropic';
import logger from './logger';

export interface MeetingSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meeting_type: string | null;
  meeting_date: string | null;
}

export interface WeeklySummaryResult {
  subject: string;
  previewText: string;
  htmlContent: string;
  plainTextContent: string;
  // Translated versions
  subject_es?: string;
  subject_pt?: string;
  htmlContent_es?: string;
  htmlContent_pt?: string;
  plainTextContent_es?: string;
  plainTextContent_pt?: string;
  // Metadata
  meetingsCount: number;
  meetingTypes: string[];
  weekStart: Date;
  weekEnd: Date;
}

export type SupportedLanguage = 'en' | 'es' | 'pt';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
};

/**
 * Fetch published blog posts from the last 7 days
 */
export async function getRecentMeetings(days: number = 7): Promise<MeetingSummary[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title, slug, excerpt, content, meeting_type, meeting_date')
    .eq('status', 'published')
    .gte('published_at', startDate.toISOString())
    .order('meeting_date', { ascending: false });

  if (error) {
    logger.error({ error }, '[Newsletter] Failed to fetch recent meetings');
    throw new Error('Failed to fetch recent meetings');
  }

  return data || [];
}

/**
 * Generate a weekly summary using Claude
 */
export async function generateWeeklySummary(
  meetings: MeetingSummary[],
  baseUrl: string = 'https://ackindex.com'
): Promise<WeeklySummaryResult> {
  if (meetings.length === 0) {
    return generateEmptyWeekSummary();
  }

  // Calculate week range
  const dates = meetings
    .filter(m => m.meeting_date)
    .map(m => new Date(m.meeting_date!));

  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // Get unique meeting types
  const meetingTypes = [...new Set(meetings.map(m => m.meeting_type).filter(Boolean))] as string[];

  // Build context for Claude
  const meetingContext = meetings.map(m => {
    return `
## ${m.title}
Type: ${m.meeting_type || 'Meeting'}
Date: ${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
Link: ${baseUrl}/blog/${m.slug}

Summary:
${m.excerpt}

Key Points:
${extractKeyPoints(m.content)}
`;
  }).join('\n---\n');

  const prompt = `You are writing a weekly newsletter for Nantucket residents about local government meetings.

Here are the meetings from this week:

${meetingContext}

Write an engaging weekly summary email that:
1. Opens with a friendly greeting and brief overview of what happened this week
2. Highlights the most important decisions, discussions, or announcements
3. Groups related topics together (e.g., all housing discussions, all budget items)
4. Uses bullet points for easy scanning
5. Includes specific details (names, numbers, dates) when relevant
6. Ends with a call-to-action to read full summaries on the website

Format your response as JSON with these fields:
{
  "subject": "Email subject line (catchy, under 60 chars)",
  "previewText": "Preview text for inbox (under 100 chars)",
  "summary": "The full email body in HTML format with proper styling"
}

Use simple, clean HTML with inline styles. Use a warm, community-focused tone.`;

  try {
    const response = await generateClaudeResponse(
      [{ role: 'user', content: prompt }],
      {
        model: 'sonnet',
        maxTokens: 2000,
        temperature: 0.7,
      }
    );

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build full HTML email (English)
    const htmlContent = buildEmailHtml(parsed.summary, meetings, baseUrl, 'en');
    const plainTextContent = stripHtml(parsed.summary);

    // Generate translations in parallel
    logger.info('[Newsletter] Generating Spanish and Portuguese translations');
    const [spanishVersion, portugueseVersion] = await Promise.all([
      translateNewsletter(parsed.subject, parsed.previewText, parsed.summary, meetings, baseUrl, 'es'),
      translateNewsletter(parsed.subject, parsed.previewText, parsed.summary, meetings, baseUrl, 'pt'),
    ]);

    return {
      subject: parsed.subject,
      previewText: parsed.previewText,
      htmlContent,
      plainTextContent,
      // Spanish
      subject_es: spanishVersion.subject,
      htmlContent_es: spanishVersion.htmlContent,
      plainTextContent_es: spanishVersion.plainTextContent,
      // Portuguese
      subject_pt: portugueseVersion.subject,
      htmlContent_pt: portugueseVersion.htmlContent,
      plainTextContent_pt: portugueseVersion.plainTextContent,
      // Metadata
      meetingsCount: meetings.length,
      meetingTypes,
      weekStart,
      weekEnd,
    };
  } catch (error) {
    logger.error({ error }, '[Newsletter] Failed to generate summary with Claude');
    throw new Error('Failed to generate newsletter summary');
  }
}

/**
 * Translate newsletter content to a target language
 */
async function translateNewsletter(
  originalSubject: string,
  originalPreviewText: string,
  originalSummary: string,
  meetings: MeetingSummary[],
  baseUrl: string,
  targetLang: 'es' | 'pt'
): Promise<{ subject: string; htmlContent: string; plainTextContent: string }> {
  const langName = LANGUAGE_NAMES[targetLang];

  try {
    const prompt = `Translate this newsletter email content to ${langName}.
Keep the same friendly, community-focused tone. Preserve any HTML formatting.

Subject line: "${originalSubject}"

Preview text: "${originalPreviewText}"

Email body:
${originalSummary}

Respond with JSON:
{
  "subject": "translated subject line",
  "previewText": "translated preview text",
  "summary": "translated email body HTML"
}`;

    const response = await generateClaudeResponse(
      [{ role: 'user', content: prompt }],
      {
        model: 'haiku', // Use Haiku for translations (faster, cheaper)
        maxTokens: 2000,
        temperature: 0.3,
      }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse translation response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const htmlContent = buildEmailHtml(parsed.summary, meetings, baseUrl, targetLang);
    const plainTextContent = stripHtml(parsed.summary);

    return {
      subject: parsed.subject,
      htmlContent,
      plainTextContent,
    };
  } catch (error) {
    logger.error({ error, targetLang }, '[Newsletter] Translation failed, using English fallback');
    // Return English version as fallback
    return {
      subject: originalSubject,
      htmlContent: buildEmailHtml(originalSummary, meetings, baseUrl, targetLang),
      plainTextContent: stripHtml(originalSummary),
    };
  }
}

/**
 * Extract key points from blog content (first few bullet points or paragraphs)
 */
function extractKeyPoints(content: string): string {
  // Look for bullet points or numbered lists
  const bulletMatches = content.match(/^[\-\*•]\s+.+$/gm);
  if (bulletMatches && bulletMatches.length > 0) {
    return bulletMatches.slice(0, 5).join('\n');
  }

  // Fall back to first few paragraphs
  const paragraphs = content.split(/\n\n/).filter(p => p.trim().length > 50);
  return paragraphs.slice(0, 3).join('\n\n');
}

// Localized UI strings for email template
const EMAIL_STRINGS: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  meetingSummaries: string;
  visitButton: string;
  footerText: string;
  unsubscribe: string;
}> = {
  en: {
    title: 'AckIndex Weekly Summary',
    subtitle: 'Your weekly digest of Nantucket town meetings',
    meetingSummaries: 'Full Meeting Summaries',
    visitButton: 'Visit AckIndex',
    footerText: "You're receiving this because you subscribed to AckIndex weekly updates.",
    unsubscribe: 'Unsubscribe',
  },
  es: {
    title: 'Resumen Semanal de AckIndex',
    subtitle: 'Tu resumen semanal de las reuniones municipales de Nantucket',
    meetingSummaries: 'Resúmenes Completos de las Reuniones',
    visitButton: 'Visitar AckIndex',
    footerText: 'Recibes este correo porque te suscribiste a las actualizaciones semanales de AckIndex.',
    unsubscribe: 'Cancelar suscripción',
  },
  pt: {
    title: 'Resumo Semanal do AckIndex',
    subtitle: 'Seu resumo semanal das reuniões municipais de Nantucket',
    meetingSummaries: 'Resumos Completos das Reuniões',
    visitButton: 'Visitar AckIndex',
    footerText: 'Você está recebendo este email porque se inscreveu nas atualizações semanais do AckIndex.',
    unsubscribe: 'Cancelar inscrição',
  },
};

/**
 * Build full HTML email with header, content, and footer
 */
function buildEmailHtml(
  summaryContent: string,
  meetings: MeetingSummary[],
  baseUrl: string,
  lang: SupportedLanguage = 'en'
): string {
  const strings = EMAIL_STRINGS[lang];

  const meetingLinks = meetings.map(m => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <a href="${baseUrl}/blog/${m.slug}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
          ${m.title}
        </a>
        <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
          ${m.meeting_type || 'Meeting'} • ${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : ''}
        </div>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strings.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #1e3a5f; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                📋 ${strings.title}
              </h1>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">
                ${strings.subtitle}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px;">
              ${summaryContent}
            </td>
          </tr>

          <!-- Meeting Links -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">
                📄 ${strings.meetingSummaries}
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${meetingLinks}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 32px 40px;" align="center">
              <a href="${baseUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                ${strings.visitButton} →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                ${strings.footerText}<br>
                <a href="${baseUrl}/unsubscribe" style="color: #6b7280;">${strings.unsubscribe}</a> •
                <a href="${baseUrl}" style="color: #6b7280;">AckIndex.com</a>
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
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate summary for weeks with no meetings
 */
function generateEmptyWeekSummary(): WeeklySummaryResult {
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  return {
    subject: 'AckIndex Weekly Update - Quiet Week in Nantucket',
    previewText: 'No new meeting summaries this week',
    htmlContent: buildEmailHtml(
      `<p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Hi there! 👋
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        It was a quiet week for Nantucket town meetings - no new summaries to share this time.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Check back next week for updates, or visit AckIndex anytime to search past meeting discussions.
      </p>`,
      [],
      'https://ackindex.com'
    ),
    plainTextContent: 'Hi there! It was a quiet week for Nantucket town meetings - no new summaries to share this time. Check back next week for updates!',
    meetingsCount: 0,
    meetingTypes: [],
    weekStart,
    weekEnd,
  };
}
