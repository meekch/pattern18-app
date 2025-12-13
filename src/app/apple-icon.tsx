import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: '#1a3a2f',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2dd4a8',
          fontWeight: 700,
          borderRadius: 32,
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