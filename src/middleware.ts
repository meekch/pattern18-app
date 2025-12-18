import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Force redirect /coach to /login for testing
  if (pathname.startsWith('/coach')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/coach/:path*', '/evidence/:path*', '/documents/:path*', '/breathe/:path*']
}