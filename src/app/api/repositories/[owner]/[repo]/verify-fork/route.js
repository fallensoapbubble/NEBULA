/**
 * Repository Verify Fork API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/repositories/[owner]/[repo]/verify-fork
 * Verify repository fork
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}