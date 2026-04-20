import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 280,
          background: '#2F9D94',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FAFAF7',
          fontWeight: 800,
          fontFamily: 'serif',
        }}
      >
        18
      </div>
    ),
    { width: 512, height: 512 }
  );
}
