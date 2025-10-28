import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserDashboard } from '@/lib/userProfile';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

