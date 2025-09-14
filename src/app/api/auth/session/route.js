/**
 * Session API Route
 * Provides authentication session data for client-side use
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/auth/session
 * Get current authentication session
 */
export async function GET(request) {
  try {
    // Extract session data from cookies
    const githubId = request.cookies.get('github_session_id')?.value;
    const username = request.cookies.get('github_username')?.value;
    const accessToken = request.cookies.get('github_access_token')?.value;
    const tokenExpiry = request.cookies.get('github_token_expiry')?.value;
    const permissions = request.cookies.get('github_permissions')?.value;
    const userDataCookie = request.cookies.get('github_user_data')?.value;

    // Check if user is authenticated
    if (!githubId || !username || !accessToken) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        session: null
      });
    }

    // Check if token is expired
    if (tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      if (expiryDate <= new Date()) {
        return NextResponse.json({
          success: true,
          authenticated: false,
          user: null,
          session: null,
          error: 'Token expired'
        });
      }
    }

    // Parse user data
    let userData = {};
    if (userDataCookie) {
      try {
        userData = JSON.parse(userDataCookie);
      } catch (error) {
        console.error('Failed to parse user data cookie:', error);
      }
    }

    // Build session response
    const session = {
      user: {
        id: githubId,
        login: username,
        name: userData.name || username,
        email: userData.email || null,
        image: userData.avatarUrl || null,
        avatar_url: userData.avatarUrl || null,
        html_url: userData.profileUrl || `https://github.com/${username}`,
        profile_url: userData.profileUrl || `https://github.com/${username}`
      },
      accessToken: accessToken,
      permissions: permissions ? permissions.split(',') : ['public_repo'],
      expires: tokenExpiry || null
    };

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: session.user,
      session: session
    });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
        session: null,
        error: 'Failed to retrieve session'
      },
      { status: 500 }
    );
  }
}