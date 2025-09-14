/**
 * Logout API Route
 * Handles user logout by clearing session cookies
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clear authentication session
 */
export async function POST(request) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear all GitHub session cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    };

    response.cookies.set('github_session_id', '', cookieOptions);
    response.cookies.set('github_username', '', cookieOptions);
    response.cookies.set('github_access_token', '', cookieOptions);
    response.cookies.set('github_refresh_token', '', cookieOptions);
    response.cookies.set('github_token_expiry', '', cookieOptions);
    response.cookies.set('github_permissions', '', cookieOptions);
    
    // Clear user data cookie (not httpOnly)
    response.cookies.set('github_user_data', '', {
      ...cookieOptions,
      httpOnly: false
    });

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to logout'
      },
      { status: 500 }
    );
  }
}