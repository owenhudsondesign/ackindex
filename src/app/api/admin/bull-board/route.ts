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
import logger from '@/lib/logger';

// We need a custom UI handler for Next.js
// Bull Board provides UI assets that we'll serve

export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/bull-board', method: 'GET' });

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

    // Check if Redis is configured
    if (!process.env.REDIS_URL) {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>Queue Dashboard - Not Configured</title></head>
<body style="font-family: sans-serif; padding: 40px; text-align: center;">
  <h1>⚠️ Queue Dashboard Not Available</h1>
  <p>Redis URL is not configured. Please add REDIS_URL to your Vercel environment variables.</p>
  <p><a href="/admin">← Back to Admin Panel</a></p>
</body>
</html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Lazy import queues to avoid module-level connection errors
    const { scrapingQueue, embeddingQueue } = await import('@/lib/queues');

    // User is authenticated and has admin role - serve Bull Board UI
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
    <title>Queue Dashboard - AckIndex</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
        // Check for dark mode preference and apply class immediately to prevent flash
        (function() {
            const theme = localStorage.getItem('ackindex-theme');
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        })();
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f9fafb;
            color: #191919;
            padding: 2rem;
            transition: background-color 0.2s, color 0.2s;
        }
        .dark body {
            background: #111827;
            color: #f9fafb;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        h1 {
            font-size: 1.875rem;
            margin-bottom: 0.5rem;
            color: #191919;
            font-weight: 700;
            transition: color 0.2s;
        }
        .dark h1 {
            color: #f9fafb;
        }
        .subtitle {
            color: #4d4d4d;
            font-size: 0.875rem;
            transition: color 0.2s;
        }
        .dark .subtitle {
            color: #9ca3af;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #2e90c6;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            transition: background-color 0.2s, color 0.2s;
        }
        .back-link:hover {
            background: #efefef;
        }
        .dark .back-link {
            color: #60a5fa;
        }
        .dark .back-link:hover {
            background: #1f2937;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            transition: background-color 0.2s, border-color 0.2s;
        }
        .dark .card {
            background: #1f2937;
            border: 1px solid #374151;
        }
        .card h2 {
            font-size: 1.125rem;
            margin-bottom: 1rem;
            color: #191919;
            font-weight: 600;
            transition: color 0.2s;
        }
        .dark .card h2 {
            color: #f9fafb;
        }
        .stats {
            display: grid;
            gap: 0.75rem;
        }
        .stat {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.875rem;
            background: #f9fafb;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            transition: background-color 0.2s, border-color 0.2s;
        }
        .dark .stat {
            background: #111827;
            border: 1px solid #374151;
        }
        .stat-label {
            color: #4d4d4d;
            font-size: 0.875rem;
            font-weight: 500;
            transition: color 0.2s;
        }
        .dark .stat-label {
            color: #9ca3af;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #191919;
            transition: color 0.2s;
        }
        .dark .stat-value {
            color: #f9fafb;
        }
        .actions {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            text-decoration: none;
        }
        .btn-primary {
            background: #2e90c6;
            color: white;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .btn-primary:hover {
            background: #2680b3;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .footer {
            text-align: center;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
            transition: border-color 0.2s;
        }
        .dark .footer {
            border-top: 1px solid #374151;
        }
        .footer-text {
            color: #6b7280;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            transition: color 0.2s;
        }
        .dark .footer-text {
            color: #9ca3af;
        }
        .auto-refresh {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #2e90c6;
            font-size: 0.875rem;
            font-weight: 500;
            transition: color 0.2s;
        }
        .dark .auto-refresh {
            color: #60a5fa;
        }
        .pulse {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #2e90c6;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .dark .pulse {
            background: #60a5fa;
        }
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Queue Dashboard</h1>
                <p class="subtitle">Real-time monitoring for scraping and embedding jobs</p>
            </div>
            <a href="/admin" class="back-link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 12L6 8L10 4"/>
                </svg>
                Back to Admin
            </a>
        </div>

        <div class="grid">
            <!-- Scraping Queue -->
            <div class="card">
                <h2>Scraping Queue</h2>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-label">Waiting</span>
                        <span class="stat-value">${scrapingCounts.waiting || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Active</span>
                        <span class="stat-value">${scrapingCounts.active || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value">${scrapingCounts.completed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Failed</span>
                        <span class="stat-value">${scrapingCounts.failed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Delayed</span>
                        <span class="stat-value">${scrapingCounts.delayed || 0}</span>
                    </div>
                </div>
            </div>

            <!-- Embedding Queue -->
            <div class="card">
                <h2>Embedding Queue</h2>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-label">Waiting</span>
                        <span class="stat-value">${embeddingCounts.waiting || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Active</span>
                        <span class="stat-value">${embeddingCounts.active || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value">${embeddingCounts.completed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Failed</span>
                        <span class="stat-value">${embeddingCounts.failed || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Delayed</span>
                        <span class="stat-value">${embeddingCounts.delayed || 0}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="actions">
            <button class="btn btn-primary" onclick="location.reload()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Refresh Now
            </button>
        </div>

        <div class="footer">
            <p class="footer-text">Last updated: ${new Date().toLocaleString()}</p>
            <p class="footer-text">Logged in as ${adminOrError.email}</p>
            <div class="auto-refresh">
                <span class="pulse"></span>
                Auto-refreshing every 10 seconds
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh every 10 seconds
        setTimeout(() => location.reload(), 10000);
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
    log.error({ err: error }, 'Bull Board error');
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
  const log = logger.child({ endpoint: '/api/admin/bull-board', method: 'POST' });
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

    // Lazy import queues
    const { scrapingQueue, embeddingQueue } = await import('@/lib/queues');
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
    log.error({ err: error }, 'Bull Board action error');
    return NextResponse.json(
      {
        message: 'Failed to perform action',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
