import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pattern18. Your 24/7 AI coach for high-conflict custody.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FAFAF7',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent */}
        <div style={{ height: 12, background: '#2F9D94', width: '100%', display: 'flex' }} />

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 72px',
            gap: 56,
          }}
        >
          {/* Teal circle with 18 */}
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 220,
              background: '#2F9D94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FAFAF7',
              fontSize: 128,
              fontWeight: 800,
              fontFamily: 'serif',
              flexShrink: 0,
            }}
          >
            18
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                color: '#2F9D94',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 6,
                marginBottom: 22,
              }}
            >
              PATTERN18
            </div>
            <div
              style={{
                color: '#1F2937',
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.05,
                fontFamily: 'serif',
                letterSpacing: -1,
                marginBottom: 18,
              }}
            >
              When their text makes your stomach drop.
            </div>
            <div
              style={{
                color: '#1F2937',
                fontSize: 30,
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              Your 24/7 AI coach is here.
            </div>
          </div>
        </div>

        {/* Bottom anchor */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '18px 72px 22px',
            color: '#1F2937',
            fontSize: 22,
            fontWeight: 600,
            opacity: 0.7,
            gap: 14,
          }}
        >
          <span>pattern18.com</span>
          <span style={{ color: '#2F9D94' }}>·</span>
          <span>$97/mo</span>
          <span style={{ color: '#2F9D94' }}>·</span>
          <span>7 days free</span>
        </div>

        {/* Bottom accent */}
        <div style={{ height: 12, background: '#2F9D94', width: '100%', display: 'flex' }} />
      </div>
    ),
    { ...size }
  );
}
