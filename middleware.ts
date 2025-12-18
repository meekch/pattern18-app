import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // On coach subdomain, redirect root to login
  if (host.startsWith('coach.') && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect /coach to /login (for now, always - we'll add auth back later)
  if (pathname.startsWith('/coach')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/coach/:path*', '/evidence/:path*']
}
