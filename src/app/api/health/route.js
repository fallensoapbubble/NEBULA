/**
 * Health Check API Route
 * Provides a lightweight endpoint for network connectivity testing
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health check endpoint for network connectivity testing
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
}

/**
 * HEAD /api/health
 * Lightweight health check for network manager connectivity tests
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}