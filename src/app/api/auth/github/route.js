import { NextResponse } from "next/server";

/**
 * GitHub OAuth initiation endpoint
 * Redirects users to GitHub for authentication with proper scopes
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get("redirect") || "/";

    // Validate environment variables
    const clientId = process.env.GITHUB_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL || "https://nebulaus.netlify.app/";
    const scopes = process.env.GITHUB_OAUTH_SCOPES || "public_repo,repo";

    if (!clientId) {
      console.error(
        "GitHub OAuth configuration missing: GITHUB_CLIENT_ID not set"
      );
      return NextResponse.json(
        { error: "GitHub OAuth not configured" },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = generateSecureState();

    // Store state and redirect URI in session/cookie for validation
    const response = NextResponse.redirect(
      buildGitHubAuthUrl({
        clientId,
        redirectUri: `${baseUrl}/api/auth/github/callback`,
        scopes,
        state,
      })
    );

    // Set secure HTTP-only cookies for state validation
    response.cookies.set("github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    response.cookies.set("github_oauth_redirect", redirectUri, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("GitHub OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate GitHub authentication" },
      { status: 500 }
    );
  }
}

/**
 * Generate secure random state parameter for CSRF protection
 */
function generateSecureState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Build GitHub OAuth authorization URL
 */
function buildGitHubAuthUrl({ clientId, redirectUri, scopes, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: state,
    response_type: "code",
    allow_signup: "true",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
