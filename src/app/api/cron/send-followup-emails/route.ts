/**
 * Cron job to send 7-day follow-up emails to new users
 *
 * This runs daily at 10am ET to check for users who signed up 7 days ago
 * and haven't received their follow-up email yet.
 *
 * Schedule: Every day at 10:00am ET
 * Vercel Cron: 0 15 * * * (10:00am ET = 15:00 UTC during EST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendFollowUpEmail } from '@/lib/emails';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized attempt to run follow-up email cron');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find users who:
    // 1. Signed up between 7-14 days ago (7 days ago to catch them, 14 days as upper bound)
    // 2. Haven't received their follow-up email yet
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: users, error: findError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, followup_email_sent')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lte('created_at', sevenDaysAgo.toISOString())
      .or('followup_email_sent.is.null,followup_email_sent.eq.false');

    if (findError) {
      logger.error({ error: findError }, '[Cron] Error finding users for follow-up');
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      logger.info('[Cron] No users need follow-up emails');
      return NextResponse.json({
        success: true,
        message: 'No users need follow-up emails'
      });
    }

    logger.info({ count: users.length }, '[Cron] Found users for follow-up emails');

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      // Get user's email from auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);

      if (authError || !authUser?.user?.email) {
        logger.error({ userId: user.id, error: authError }, '[Cron] Could not get user email');
        failed++;
        errors.push(`Could not get email for user ${user.id}`);
        continue;
      }

      const email = authUser.user.email;
      const fullName = user.full_name || '';

      // Send the follow-up email
      const result = await sendFollowUpEmail(email, fullName);

      if (result.success) {
        // Mark as sent
        await supabaseAdmin
          .from('user_profiles')
          .update({ followup_email_sent: true, followup_email_sent_at: new Date().toISOString() })
          .eq('id', user.id);

        sent++;
        logger.info({ email }, '[Cron] Follow-up email sent');
      } else {
        failed++;
        errors.push(`Failed to send to ${email}: ${result.error}`);
        logger.error({ email, error: result.error }, '[Cron] Failed to send follow-up email');
      }
    }

    logger.info({ sent, failed }, '[Cron] Follow-up email cron completed');

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sent} follow-up email${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`
    });
  } catch (error) {
    logger.error({ error }, '[Cron] Unexpected error in follow-up email cron');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
