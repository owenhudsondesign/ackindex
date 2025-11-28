/**
 * Newsletter Stats API
 *
 * GET /api/admin/newsletter/stats - Get subscriber statistics
 */

import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function GET() {
  try {
    // Auth check
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get total active subscribers
    const { count: total, error: totalError } = await supabaseAdmin
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('is_subscribed', true);

    if (totalError) {
      logger.error({ error: totalError }, '[Newsletter Stats] Failed to get total count');
    }

    // Get counts by language
    const { data: languageCounts, error: langError } = await supabaseAdmin
      .from('email_subscribers')
      .select('preferred_language')
      .eq('is_subscribed', true);

    if (langError) {
      logger.error({ error: langError }, '[Newsletter Stats] Failed to get language counts');
    }

    // Calculate language distribution
    const byLanguage = { en: 0, es: 0, pt: 0 };
    if (languageCounts) {
      for (const sub of languageCounts) {
        const lang = (sub.preferred_language || 'en') as keyof typeof byLanguage;
        if (lang in byLanguage) {
          byLanguage[lang]++;
        } else {
          byLanguage.en++; // Default to English for unknown languages
        }
      }
    }

    return NextResponse.json({
      total: total || 0,
      byLanguage,
    });
  } catch (error) {
    logger.error({ error }, '[Newsletter Stats] Unexpected error');
    return NextResponse.json(
      { error: 'Failed to fetch subscriber stats' },
      { status: 500 }
    );
  }
}
