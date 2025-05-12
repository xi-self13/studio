// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
// import { admin, initializeAdminApp } from '@/lib/auth/firebaseAdmin';

// This middleware is currently a placeholder. 
// You can expand it to protect routes or refresh session cookies.

// Example: Protect a specific route
// const PROTECTED_ROUTES = ['/dashboard'];

export async function middleware(request: NextRequest) {
  // initializeAdminApp(); // Ensure admin app is initialized if doing auth checks

  const currentUser = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  // Example: Redirect to login if trying to access a protected route without a session
  // if (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) && !currentUser) {
  //   const loginUrl = new URL('/', request.url); // Adjust to your login page
  //   loginUrl.searchParams.set('redirectedFrom', pathname);
  //   return NextResponse.redirect(loginUrl);
  // }

  // Example: Refresh session cookie (simplified, needs more robust logic for expiry checks)
  // if (currentUser) {
  //   try {
  //     // This is a simplified example. In a real app, you'd verify the cookie,
  //     // check its expiry, and potentially re-issue it if it's close to expiring.
  //     // Verifying it here on every request can be expensive.
  //     // const decodedIdToken = await admin.auth().verifySessionCookie(currentUser, true);
  //     // console.log("Session cookie is valid for UID:", decodedIdToken.uid);
  //   } catch (error) {
  //     // Cookie is invalid or expired, clear it and potentially redirect
  //     console.log("Session cookie invalid in middleware, clearing it.");
  //     const response = NextResponse.next();
  //     response.cookies.delete('__session');
  //     // If on a protected route, redirect to login
  //     // if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
  //     //   return NextResponse.redirect(new URL('/', request.url));
  //     // }
  //     return response;
  //   }
  // }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
