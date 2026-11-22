import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'cv_session'

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value

  // Protect dashboard, analyze and admin routes
  if (!sessionId && (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/analyze') ||
    request.nextUrl.pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (sessionId && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analyze/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
  ],
}