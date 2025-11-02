/**
 * Next.js Instrumentation
 *
 * This file is used to initialize Sentry and other observability tools.
 * It runs once when the server starts.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string; // resource path, e.g. /blog?name=foo
    method: string; // request method. e.g. GET, POST, etc
    headers: { [key: string]: string };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'; // the router type
    routePath: string; // the route file path, e.g. /app/blog/[dynamic]
    routeType: 'render' | 'route' | 'action' | 'middleware'; // the context in which the error occurred
    renderSource:
      | 'react-server-components'
      | 'react-server-components-payload'
      | 'server-rendering';
    revalidateReason: 'on-demand' | 'stale' | undefined; // undefined is a normal request without revalidation
    renderType: 'dynamic' | 'dynamic-resume'; // 'dynamic-resume' for PPR
  }
) => {
  // Send to Sentry with additional context
  const Sentry = await import('@sentry/nextjs');

  Sentry.captureException(err, {
    contexts: {
      nextjs: {
        request_path: request.path,
        request_method: request.method,
        router_kind: context.routerKind,
        route_path: context.routePath,
        route_type: context.routeType,
        render_source: context.renderSource,
      },
    },
  });
};
