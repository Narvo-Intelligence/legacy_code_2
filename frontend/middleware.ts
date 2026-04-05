import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO_COOKIE = 'narvo_demo_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(DEMO_COOKIE)?.value === '1';

  if (
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/briefing') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/library') ||
      pathname.startsWith('/discover') ||
      pathname.startsWith('/search') ||
      pathname.startsWith('/listen') ||
      pathname.startsWith('/insights')) &&
    !hasSession
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/onboarding') && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', '/onboarding');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/briefing',
    '/briefing/:path*',
    '/settings',
    '/settings/:path*',
    '/library',
    '/library/:path*',
    '/discover',
    '/discover/:path*',
    '/search',
    '/search/:path*',
    '/listen',
    '/listen/:path*',
    '/insights',
    '/insights/:path*',
    '/onboarding',
  ],
};
