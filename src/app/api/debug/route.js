/**
 * Debug API Route
 * Helps diagnose environment and configuration issues
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasGitHubClientId: !!process.env.GITHUB_CLIENT_ID,
        hasGitHubClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
      runtime: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      },
      headers: {
        host: process.env.VERCEL_URL || 'localhost',
        userAgent: 'Debug Route',
      }
    };

    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}