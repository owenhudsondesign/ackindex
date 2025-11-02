/**
 * Bull Board UI Endpoint
 *
 * Serves the Bull Board web interface for monitoring job queues.
 * Protected by admin authentication - only accessible to users with admin role.
 *
 * Security features:
 * - Supabase session authentication
 * - Admin role verification from user_profiles table
 * - Returns 401 for unauthenticated users
 * - Returns 403 for authenticated but non-admin users
 *
 * Access at: /api/admin/bull-board
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { scrapingQueue, embeddingQueue } from '@/lib/queues';

// We need a custom UI handler for Next.js
// Bull Board provides UI assets that we'll serve

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    // SECURITY: Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) {
      // User is not authenticated or not an admin
      return adminOrError;
    }

    // User is authenticated and has admin role - serve Bull Board UI
    const { path } = await params;
    const uiPath = path ? path.join('/') : '';

    // Get queue statistics directly (we're serving custom HTML, not using Bull Board UI)
    const [scrapingCounts, embeddingCounts] = await Promise.all([
      scrapingQueue.getJobCounts(),
      embeddingQueue.getJobCounts(),
    ]);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AckIndex Queue Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: #f1f5f9;
        }
        .subtitle {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            padding: 1.5rem;
        }
        .card h2 {
            font-size: 1.25rem;
            margin-bottom: 1rem;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .stats {
            display: grid;
            gap: 0.75rem;
        }
        .stat {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: #0f172a;
            border-radius: 0.375rem;
            border: 1px solid #334155;
        }
        .stat-label {
            color: #cbd5e1;
            font-size: 0.875rem;
        }
        .stat-value {
            font-size: 1.25rem;
            font-weight: 600;
        }
        .stat-value.waiting { color: #60a5fa; }
        .stat-value.active { color: #34d399; }
        .stat-value.completed { color: #a78bfa; }
        .stat-value.failed { color: #f87171; }
        .stat-value.delayed { color: #fbbf24; }
        .refresh-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.2s;
        }
        .refresh-btn:hover {
            background: #2563eb;
        }
        .last-updated {
            color: #64748b;
            font-size: 0.875rem;
            text-align: center;
            margin-top: 1rem;
        }
        .icon {
            font-size: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AckIndex Queue Dashboard</h1>
        <p class="subtitle">Real-time monitoring for scraping and embedding jobs</p>

        <div class="grid">
            <!-- Scraping Queue -->
            <div class="card">
                <h2><span class="icon">🌐</span> Scraping Queue</h2>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-label">Waiting</span>
                        <span class="stat-value waiting">${scrapingCounts.waiting || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Active</span>
                        <span class="stat-value active">${scrapingCounts.active || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value completed">${scrapingCounts.completed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Failed</span>
                        <span class="stat-value failed">${scrapingCounts.failed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Delayed</span>
                        <span class="stat-value delayed">${scrapingCounts.delayed || 0}</span>
                    </div>
                </div>
            </div>

            <!-- Embedding Queue -->
            <div class="card">
                <h2><span class="icon">🧠</span> Embedding Queue</h2>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-label">Waiting</span>
                        <span class="stat-value waiting">${embeddingCounts.waiting || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Active</span>
                        <span class="stat-value active">${embeddingCounts.active || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value completed">${embeddingCounts.completed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Failed</span>
                        <span class="stat-value failed">${embeddingCounts.failed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Delayed</span>
                        <span class="stat-value delayed">${embeddingCounts.delayed || 0}</span>
                    </div>
                </div>
            </div>
        </div>

        <div style="text-align: center;">
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Dashboard</button>
        </div>

        <p class="last-updated">Last updated: ${new Date().toLocaleString()}</p>
        <p class="last-updated">Logged in as: ${adminOrError.email} (Admin)</p>
    </div>

    <script>
        // Auto-refresh every 5 seconds
        setTimeout(() => location.reload(), 5000);
    </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  } catch (error) {
    console.error('[Bull Board] Error:', error);
    return NextResponse.json(
      {
        message: 'Failed to load Bull Board',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also handle POST requests for Bull Board actions (retry, remove jobs, etc.)
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) {
      return adminOrError;
    }

    const body = await request.json();
    const { action, queueName, jobId } = body;

    if (!action || !queueName || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, queueName, jobId' },
        { status: 400 }
      );
    }

    const queue = queueName === 'scraping' ? scrapingQueue : embeddingQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    switch (action) {
      case 'retry':
        await job.retry();
        return NextResponse.json({ success: true, message: 'Job retried' });

      case 'remove':
        await job.remove();
        return NextResponse.json({ success: true, message: 'Job removed' });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: retry, remove' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Bull Board] Action error:', error);
    return NextResponse.json(
      {
        message: 'Failed to perform action',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
