import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that are publicly reachable (no auth gate).
// Homepage: marketing for logged-out; authed users get bounced to /coach.
// /faq, OG images: fully public.
const PUBLIC_PATHS = new Set(['/', '/faq', '/opengraph-image', '/twitter-image'])

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()

  // Public marketing surfaces: only touch Supabase when we detect an auth
  // cookie, and only to send authed users on `/` to /coach.
  if (PUBLIC_PATHS.has(pathname)) {
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

    if (hasAuthCookie && pathname === '/') {
      return NextResponse.redirect(new URL('/coach', request.url))
    }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Skip subscription check if returning from Stripe checkout
  if (request.nextUrl.searchParams.get('success') === 'true') {
    return response
  }

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const status = profile?.subscription_status
  if (status !== 'active' && status !== 'trialing') {
    return NextResponse.redirect(new URL('/subscribe', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|subscribe|pricing|auth|api|resources|getting-started|icon|manifest|thank-you|demo|dashboard|faq|opengraph-image|twitter-image).*)'],
}
