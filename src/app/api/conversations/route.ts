import { NextRequest, NextResponse } from 'next/server';
import { getUserConversations } from '@/lib/conversations';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function getUserFromRequest(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session } } = await supabaseSSR.auth.getSession();

    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
      };
    }
  } catch (error) {
    // Silent fail
  }

  return null;
}

export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/conversations' });

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const conversations = await getUserConversations(user.id, 50);

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch conversations');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
