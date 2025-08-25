import { NextResponse } from 'next/server';

/**
 * Logout endpoint
 * Note: With NextAuth, logout should be handled client-side using signOut()
 * This endpoint is kept for backward compatibility
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirect') || '/';
    
    // For NextAuth, we redirect to the signout endpoint
    const signOutUrl = new URL('/api/auth/signout', request.url);
    signOutUrl.searchParams.set('callbackUrl', redirectTo);
    
    return NextResponse.redirect(signOutUrl);
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

/**
 * GET method for logout (for simple link-based logout)
 */
export async function GET(request) {
  return POST(request);
}