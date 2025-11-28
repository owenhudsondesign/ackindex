/**
 * User Email Preferences API
 *
 * POST /api/user/email-preferences - Update email subscription preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email_updates_enabled, preferred_language } = body;

    // Validate inputs
    const validLanguages = ['en', 'es', 'pt'];
    const hasEmailUpdate = typeof email_updates_enabled === 'boolean';
    const hasLanguageUpdate = typeof preferred_language === 'string' && validLanguages.includes(preferred_language);

    if (!hasEmailUpdate && !hasLanguageUpdate) {
      return NextResponse.json(
        { error: 'Invalid request body - must include email_updates_enabled or preferred_language' },
        { status: 400 }
      );
    }

    logger.info({
      userId: user.id,
      email_updates_enabled,
      preferred_language,
    }, '[EmailPreferences] Updating user preferences');

    // Build update object for user_profiles
    const profileUpdate: Record<string, unknown> = {};
    if (hasEmailUpdate) {
      profileUpdate.email_updates_enabled = email_updates_enabled;
    }

    // Update user_profiles table if we have something to update
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) {
        logger.error({ error: profileError }, '[EmailPreferences] Failed to update user_profiles');
        return NextResponse.json(
          { error: 'Failed to update preferences' },
          { status: 500 }
        );
      }
    }

    // Sync with email_subscribers table
    // This ensures Dreamlit can query subscribers correctly
    if (hasEmailUpdate) {
      if (email_updates_enabled) {
        // Upsert into email_subscribers
        const subscriberData: Record<string, unknown> = {
          email: user.email,
          user_id: user.id,
          is_subscribed: true,
          frequency: 'weekly',
          verified: true, // Account users are verified
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        };

        // Include language if provided
        if (hasLanguageUpdate) {
          subscriberData.preferred_language = preferred_language;
        }

        const { error: subscriberError } = await supabaseAdmin
          .from('email_subscribers')
          .upsert(subscriberData, {
            onConflict: 'email',
          });

        if (subscriberError) {
          logger.warn({ error: subscriberError }, '[EmailPreferences] Failed to upsert email_subscribers');
        }
      } else {
        // Update email_subscribers to unsubscribed
        const { error: unsubError } = await supabaseAdmin
          .from('email_subscribers')
          .update({
            is_subscribed: false,
            unsubscribed_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (unsubError) {
          logger.warn({ error: unsubError }, '[EmailPreferences] Failed to update email_subscribers');
        }
      }
    } else if (hasLanguageUpdate) {
      // Just updating language preference
      const { error: langError } = await supabaseAdmin
        .from('email_subscribers')
        .update({ preferred_language })
        .eq('user_id', user.id);

      if (langError) {
        logger.warn({ error: langError }, '[EmailPreferences] Failed to update language preference');
      }
    }

    logger.info({
      userId: user.id,
      email_updates_enabled,
      preferred_language,
    }, '[EmailPreferences] Preferences updated successfully');

    return NextResponse.json({
      success: true,
      ...(hasEmailUpdate && { email_updates_enabled }),
      ...(hasLanguageUpdate && { preferred_language }),
    });
  } catch (error) {
    logger.error({ error }, '[EmailPreferences] Unexpected error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
