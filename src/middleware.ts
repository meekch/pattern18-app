import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // If on coach.pattern18.com and hitting root, redirect to /coach
  if (host.startsWith('coach.') && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/coach', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/',
}