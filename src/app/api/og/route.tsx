import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Generate OG images for blog posts and meeting videos
 * Usage: /api/og?title=Meeting+Title&date=2024-01-15&type=Select+Board
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get('title') || 'Town Meeting';
  const date = searchParams.get('date');
  const meetingType = searchParams.get('type');

  // Format date if provided
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a', // dark slate
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
          padding: '40px 60px',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Play Button Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            marginBottom: '30px',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)',
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Meeting Type Badge */}
        {meetingType && (
          <div
            style={{
              display: 'flex',
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#93c5fd',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {meetingType}
            </span>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 60 ? '36px' : '48px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '900px',
            marginBottom: '20px',
          }}
        >
          {title}
        </div>

        {/* Date */}
        {formattedDate && (
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: '#94a3b8',
              marginTop: '10px',
            }}
          >
            {formattedDate}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#60a5fa',
            }}
          >
            AckIndex
          </span>
          <span
            style={{
              fontSize: '18px',
              color: '#64748b',
            }}
          >
            | Nantucket Town Meeting Archive
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
