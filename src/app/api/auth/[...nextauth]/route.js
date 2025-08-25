/**
 * NextAuth API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/auth/[...nextauth]
 * NextAuth GET handler
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Authentication temporarily disabled - build fix' },
    { status: 503 }
  );
}

/**
 * POST /api/auth/[...nextauth]
 * NextAuth POST handler
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Authentication temporarily disabled - build fix' },
    { status: 503 }
  );
}