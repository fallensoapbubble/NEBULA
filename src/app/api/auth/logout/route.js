import { NextResponse } from 'next/server';
import { clearUserSession } from '../../../../../lib/github-auth.js';

/**
 * Logout endpoint
 * Clears user session and redirects to home page
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirect') || '/';
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    
    // Clear all session cookies
    clearUserSession(response);
    
    return response;
    
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