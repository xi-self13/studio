// src/app/api/auth/sessionLogout/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { admin, initializeAdminApp } from '@/lib/auth/firebaseAdmin';

export async function POST(request: NextRequest) {
  initializeAdminApp(); // Ensure admin app is initialized

  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ status: 'already logged out' }, { status: 200 });
  }
  
  try {
    // Verify the session cookie. This is important to ensure it's a valid cookie.
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
    // Revoke the refresh tokens for the user associated with the session cookie.
    await admin.auth().revokeRefreshTokens(decodedClaims.sub);
  } catch (error) {
    // Session cookie is invalid or expired.
    // This is not necessarily an error for logout, as the cookie might have already expired.
    console.warn('Error verifying or revoking session cookie on logout:', error);
  }

  // Clear the session cookie
  const response = NextResponse.json({ status: 'success' }, { status: 200 });
  response.cookies.set({
    name: '__session',
    value: '',
    maxAge: -1, // Expire immediately
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
