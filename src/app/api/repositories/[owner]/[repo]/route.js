/**
 * Repository API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/repositories/[owner]/[repo]
 * Get repository information
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}