import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // On coach subdomain root, redirect based on auth
    if (host.startsWith('coach.') && pathname === '/') {
      if (user) {
        return NextResponse.redirect(new URL('/coach', request.url))
      } else {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    // Protected routes - need auth
    if (pathname.startsWith('/coach') || pathname.startsWith('/evidence')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    return NextResponse.next()
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/', '/coach/:path*', '/evidence/:path*']
}
