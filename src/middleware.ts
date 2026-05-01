import { NextResponse } from 'next/server'

export const runtime = 'experimental-edge'

export default async function middleware(req: Request) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // Skip auth during build/static generation
  if (typeof window === 'undefined' && !req.headers.get('user-agent')) {
    return NextResponse.next()
  }

  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const sessionToken = cookieHeader.split('session=')[1]?.split(';')[0]
    let isLoggedIn = false
    
    if (sessionToken) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString())
        if (sessionData.expires > Date.now()) {
          isLoggedIn = true
        }
      } catch (e) {
        isLoggedIn = false
      }
    }

    const isApiAuthRoute = pathname.startsWith('/api/auth')
    const isPublicRoute = ['/', '/auth', '/portal', '/chatbot', '/images', '/blogs', '/dashboard'].some(
      (route) => pathname.startsWith(route)
    )
    const isAuthRoute = pathname.startsWith('/auth')

    if (isApiAuthRoute) {
      return NextResponse.next()
    }

    if (isAuthRoute) {
      if (isLoggedIn) {
        if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
          return NextResponse.next()
        }
        return NextResponse.redirect(new URL('/dashboard', url))
      }
      return NextResponse.next()
    }

    if (isPublicRoute) {
      return NextResponse.next()
    }

    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/sign-in', url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}