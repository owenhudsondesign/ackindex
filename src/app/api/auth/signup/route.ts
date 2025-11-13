import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/auth/signup' });

  try {
    const body = await request.json();
    const { email, password, fullName, emailUpdates } = body;

    log.info({ email }, 'Received signup request');

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth using regular signup
    log.info('Attempting to create user');
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          email_updates: emailUpdates || false,
        },
      },
    });

    if (authError) {
      log.error({ err: authError, message: authError.message }, 'Auth error during signup');

      // Check if user already exists
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please use a different email or try logging in.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user profile (using service role, bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName || null,
        email_updates_enabled: emailUpdates || false,
      });

    if (profileError) {
      log.error({
        err: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        userId: authData.user.id
      }, 'Profile creation error');

      // Return error to user so they know what went wrong
      return NextResponse.json(
        { error: `Database error: ${profileError.message || 'Failed to create user profile'}` },
        { status: 500 }
      );
    }

    // If email updates enabled, add to email_subscribers
    if (emailUpdates) {
      const { error: subscriberError } = await supabaseAdmin
        .from('email_subscribers')
        .insert({
          email: email,
          user_id: authData.user.id,
          is_subscribed: true,
          verified: true,
          frequency: 'weekly',
        });

      if (subscriberError) {
        log.error({
          err: subscriberError,
          code: subscriberError.code,
          message: subscriberError.message,
          userId: authData.user.id
        }, 'Email subscriber creation error');
        // Don't fail signup if email subscription fails
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, 'Signup error');
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}

