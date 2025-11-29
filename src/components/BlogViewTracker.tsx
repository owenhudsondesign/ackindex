'use client';

import { useEffect, useRef } from 'react';

interface BlogViewTrackerProps {
  slug: string;
}

/**
 * Client component that tracks blog post views
 * Sends a POST request to increment view count once per page load
 */
export default function BlogViewTracker({ slug }: BlogViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per component mount
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Fire and forget - don't block page load
    fetch(`/api/blog/${slug}/view`, {
      method: 'POST',
    }).catch(() => {
      // Silently fail - view tracking is non-critical
    });
  }, [slug]);

  // This component renders nothing
  return null;
}
