import { NextRequest, NextResponse } from 'next/server';
import { getUserDashboard } from '@/lib/userProfile';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/user/dashboard' });

  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Not authenticated - no authorization header' },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client and verify the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated - invalid token' },
        { status: 401 }
      );
    }

    // Get dashboard data
    const dashboard = await getUserDashboard(user.id);

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Failed to load dashboard data' },
        { status: 500 }
      );
    }

    return NextResponse.json(dashboard);
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching dashboard');
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

