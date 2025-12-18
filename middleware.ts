import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check for Supabase auth cookie - try multiple patterns
  const cookies = request.cookies.getAll()
  const hasAuth = cookies.some(c => 
    c.name.startsWith('sb-') || 
    c.name.includes('supabase') ||
    c.name.includes('auth')
  )

  // Protected routes
  if (pathname === '/' || pathname.startsWith('/coach') || pathname.startsWith('/evidence')) {
    if (!hasAuth) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/coach', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/coach', '/coach/:path*', '/evidence/:path*']
}
