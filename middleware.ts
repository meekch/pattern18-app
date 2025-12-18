import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // ALWAYS redirect to login - no conditions
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/', '/coach', '/coach/:path*']
}
