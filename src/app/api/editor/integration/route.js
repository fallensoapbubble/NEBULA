/**
 * Content Editor Integration API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/editor/integration
 * Get integration status
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}

/**
 * POST /api/editor/integration
 * Save content with integrated repository management
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}