/**
 * Repository Fork Status API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/repositories/[owner]/[repo]/fork-status
 * Get repository fork status
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}