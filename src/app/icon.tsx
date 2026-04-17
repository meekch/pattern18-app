import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: '#2F9D94',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FAFAF7',
          fontWeight: 700,
          borderRadius: 6,
          fontFamily: 'serif',
        }}
      >
        18
      </div>
    ),
    {
      ...size,
    }
  )
}
