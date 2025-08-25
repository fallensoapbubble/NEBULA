/**
 * Content Editor Conflicts API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/editor/conflicts
 * Check for conflicts before saving content
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}

/**
 * GET /api/editor/conflicts
 * Get conflict resolution status
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}