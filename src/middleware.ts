import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default async function middleware(req: any) {
  const { nextUrl } = req
  
  // Skip auth during build/static generation
  if (typeof window === 'undefined' && !req.headers.get('user-agent')) {
    return NextResponse.next()
  }

  try {
    const session = await auth()
    const isLoggedIn = !!session?.user?.id
    const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
    const isPublicRoute = ['/', '/auth', '/portal', '/chatbot', '/images', '/blogs'].some(
      (route) => nextUrl.pathname.startsWith(route)
    )
    const isAuthRoute = nextUrl.pathname.startsWith('/auth')
    const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard') || 
                             nextUrl.pathname.startsWith('/(dashboard)')

    if (isApiAuthRoute) {
      return NextResponse.next()
    }

    if (isAuthRoute) {
      if (isLoggedIn) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
      return NextResponse.next()
    }

    // Allow public routes without authentication
    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Redirect to sign-in if not logged in and trying to access protected route
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/sign-in', nextUrl))
    }

    return NextResponse.next()
  } catch (error) {
    // Fallback during build or auth errors
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
