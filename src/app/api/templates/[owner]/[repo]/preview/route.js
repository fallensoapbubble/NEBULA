/**
 * Template Preview API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/templates/[owner]/[repo]/preview
 * Get template preview
 */
export async function GET(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}