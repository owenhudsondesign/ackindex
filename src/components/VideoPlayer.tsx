'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  durationSeconds?: number;
}

/**
 * Video player component that supports timestamp deep linking via URL hash
 * Use #t=XXX in URL to jump to specific timestamp (in seconds)
 */
export default function VideoPlayer({ src, poster, durationSeconds }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check for timestamp in URL hash on mount and hash change
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#t=(\d+)$/);

      if (match && videoRef.current) {
        const timestamp = parseInt(match[1], 10);
        videoRef.current.currentTime = timestamp;
        // Scroll video into view
        videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Auto-play after seeking
        videoRef.current.play().catch(() => {
          // Autoplay may be blocked by browser, that's ok
        });
      }
    };

    // Check on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="overflow-hidden rounded-xl shadow-2xl bg-black">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          className="w-full h-full"
          poster={poster}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5 text-ack-blue" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-sm font-medium">Full Meeting Recording</span>
        </div>
        {durationSeconds && (
          <span className="text-sm text-gray-400">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>
    </div>
  );
}
