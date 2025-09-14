import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

/**
 * GitHub OAuth callback endpoint
 * Handles the OAuth callback and exchanges code for access token
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("GitHub OAuth error:", error);
      return redirectWithError("GitHub authentication was denied or failed");
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing OAuth parameters:", {
        code: !!code,
        state: !!state,
      });
      return redirectWithError("Invalid OAuth callback parameters");
    }

    // Validate state parameter (CSRF protection)
    const storedState = request.cookies.get("github_oauth_state")?.value;
    const redirectUri =
      request.cookies.get("github_oauth_redirect")?.value || "/";

    if (!storedState || storedState !== state) {
      console.error("OAuth state mismatch:", {
        stored: storedState,
        received: state,
      });
      return redirectWithError("Invalid OAuth state parameter");
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    if (!tokenData.access_token) {
      console.error("Failed to obtain access token");
      return redirectWithError("Failed to complete GitHub authentication");
    }

    // Get user information
    const userData = await getUserData(tokenData.access_token);

    // Create user session
    const sessionData = {
      githubId: userData.id.toString(),
      username: userData.login,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
      permissions: tokenData.scope
        ? tokenData.scope.split(",")
        : ["public_repo", "repo"],
      userData: {
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        profileUrl: userData.html_url,
      },
    };

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUri, request.url));

    // Set secure session cookies
    setSessionCookies(response, sessionData);

    // Clear OAuth state cookies
    clearOAuthCookies(response);

    return response;
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return redirectWithError("Authentication failed due to server error");
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || "https://nebulaus.netlify.app";

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Nebula-Portfolio-Platform",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: `${baseUrl}/api/auth/github/callback`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub token exchange failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `GitHub OAuth error: ${data.error_description || data.error}`
    );
  }

  return data;
}

/**
 * Get user data from GitHub API
 */
async function getUserData(accessToken) {
  const octokit = new Octokit({
    auth: accessToken,
    userAgent: "Nebula-Portfolio-Platform",
  });

  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}

/**
 * Set secure session cookies
 */
function setSessionCookies(response, sessionData) {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  };

  // Store session data in separate cookies for security
  response.cookies.set(
    "github_session_id",
    sessionData.githubId,
    cookieOptions
  );
  response.cookies.set("github_username", sessionData.username, cookieOptions);
  response.cookies.set(
    "github_access_token",
    sessionData.accessToken,
    cookieOptions
  );

  if (sessionData.refreshToken) {
    response.cookies.set(
      "github_refresh_token",
      sessionData.refreshToken,
      cookieOptions
    );
  }

  response.cookies.set(
    "github_token_expiry",
    sessionData.tokenExpiry.toISOString(),
    cookieOptions
  );
  response.cookies.set(
    "github_permissions",
    sessionData.permissions.join(","),
    cookieOptions
  );

  // Store user data as JSON (less sensitive)
  response.cookies.set(
    "github_user_data",
    JSON.stringify(sessionData.userData),
    {
      ...cookieOptions,
      httpOnly: false, // Allow client-side access for user info display
    }
  );
}

/**
 * Clear OAuth state cookies
 */
function clearOAuthCookies(response) {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  };

  response.cookies.set("github_oauth_state", "", clearOptions);
  response.cookies.set("github_oauth_redirect", "", clearOptions);
}

/**
 * Redirect with error message
 */
function redirectWithError(message) {
  const errorUrl = new URL(
    "/auth/error",
    process.env.NEXTAUTH_URL || "https://nebulaus.netlify.app"
  );
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl);
}
