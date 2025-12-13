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
          background: '#1a3a2f',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2dd4a8',
          fontWeight: 700,
          borderRadius: 6,
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