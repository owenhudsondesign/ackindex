import { NextRequest, NextResponse } from 'next/server';
import { deleteConversation, getConversationMessages } from '@/lib/conversations';
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

    const { data: { user }, error } = await supabaseSSR.auth.getUser();

    if (!error && user) {
      return {
        id: user.id,
        email: user.email || '',
      };
    }
  } catch (error) {
    // Silent fail
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const log = logger.child({ endpoint: '/api/conversations/[id]', conversationId: id });

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      log.warn('Unauthenticated request to get conversation messages');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    log.info({ conversationId: id, userId: user.id }, 'Fetching conversation messages');
    
    const messages = await getConversationMessages(id, user.id);
    
    log.info({ 
      conversationId: id, 
      userId: user.id, 
      messageCount: messages.length,
      messages: messages.length > 0 ? messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content?.length || 0 })) : []
    }, 'Retrieved conversation messages');

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch conversation messages');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const log = logger.child({ endpoint: '/api/conversations/[id]', conversationId: id });

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const success = await deleteConversation(id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete conversation');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
