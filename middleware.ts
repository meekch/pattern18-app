import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Check for auth cookie directly
  const hasAuthCookie = request.cookies.getAll().some(cookie => 
    cookie.name.includes('auth-token') || 
    cookie.name.includes('sb-') ||
    cookie.name.includes('supabase')
  )

  // On coach subdomain root, redirect based on auth
  if (host.startsWith('coach.') && pathname === '/') {
    if (hasAuthCookie) {
      return NextResponse.redirect(new URL('/coach', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protected routes - need auth
  if (pathname.startsWith('/coach') || pathname.startsWith('/evidence')) {
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/coach/:path*', '/evidence/:path*']
}
