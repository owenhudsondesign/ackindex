/**
 * Batch Blog Post Operations API
 * Handles batch publish/unpublish operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAdminUser(): Promise<{ id: string } | null> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.getAll().find(c => c.name.includes('-auth-token'));
    if (!authCookie) return null;

    let cookieValue = authCookie.value;
    let accessToken: string;

    if (cookieValue.startsWith('base64-')) {
      cookieValue = Buffer.from(cookieValue.substring(7), 'base64').toString('utf-8');
    }

    if (cookieValue.startsWith('{')) {
      const parsed = JSON.parse(cookieValue);
      accessToken = parsed.access_token || parsed.accessToken;
    } else if (cookieValue.startsWith('[')) {
      const parsed = JSON.parse(cookieValue);
      accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
    } else if (cookieValue.startsWith('eyJ')) {
      accessToken = cookieValue;
    } else {
      return null;
    }

    if (!accessToken || !accessToken.startsWith('eyJ')) return null;

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) return null;

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') return null;

    return { id: user.id };
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postIds, action } = body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: 'postIds array required' }, { status: 400 });
    }

    if (action === 'publish') {
      const { error, count } = await supabaseAdmin
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .in('id', postIds);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        published: count || postIds.length,
        message: `${count || postIds.length} post(s) published`,
      });
    }

    if (action === 'unpublish') {
      const { error, count } = await supabaseAdmin
        .from('blog_posts')
        .update({
          status: 'draft',
        })
        .in('id', postIds);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        unpublished: count || postIds.length,
        message: `${count || postIds.length} post(s) unpublished`,
      });
    }

    if (action === 'delete') {
      const { error, count } = await supabaseAdmin
        .from('blog_posts')
        .delete()
        .in('id', postIds);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        deleted: count || postIds.length,
        message: `${count || postIds.length} post(s) deleted`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Batch blog API error:', error);
    return NextResponse.json({ error: 'Failed to process batch action' }, { status: 500 });
  }
}
