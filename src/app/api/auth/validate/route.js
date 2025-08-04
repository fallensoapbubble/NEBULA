import { NextResponse } from "next/server";
import {
  getUserSession,
  isSessionValid,
  validateGitHubToken,
  refreshGitHubToken,
} from "../../../../../lib/github-auth.js";

/**
 * Token validation endpoint
 * Validates current user session and refreshes token if needed
 */
export async function GET(request) {
  try {
    const session = getUserSession(request);

    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: "No active session" },
        { status: 401 }
      );
    }

    // Check if session is still valid
    if (!isSessionValid(session)) {
      // Try to refresh token if refresh token is available
      if (session.refreshToken) {
        const refreshResult = await refreshGitHubToken(session.refreshToken);

        if (refreshResult.success) {
          // Update session with new tokens
          const response = NextResponse.json({
            authenticated: true,
            user: session.userData,
            refreshed: true,
          });

          // Update cookies with new tokens
          const isProduction = process.env.NODE_ENV === "production";
          const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: "/",
          };

          response.cookies.set(
            "github_access_token",
            refreshResult.tokens.accessToken,
            cookieOptions
          );

          if (refreshResult.tokens.refreshToken !== session.refreshToken) {
            response.cookies.set(
              "github_refresh_token",
              refreshResult.tokens.refreshToken,
              cookieOptions
            );
          }

          const newExpiry = new Date(
            Date.now() + refreshResult.tokens.expiresIn * 1000
          );
          response.cookies.set(
            "github_token_expiry",
            newExpiry.toISOString(),
            cookieOptions
          );

          return response;
        }
      }

      return NextResponse.json(
        { authenticated: false, error: "Session expired" },
        { status: 401 }
      );
    }

    // Validate token with GitHub API
    const validation = await validateGitHubToken(session.accessToken);

    if (!validation.valid) {
      return NextResponse.json(
        { authenticated: false, error: validation.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...session.userData,
        ...validation.user,
      },
      permissions: session.permissions,
      rateLimit: validation.rateLimit,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}
