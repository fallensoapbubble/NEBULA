/**
 * Content Editor Retry API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/editor/retry
 * Retry a failed content save operation
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}

/**
 * GET /api/editor/retry/status
 * Get retry status and recommendations
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}