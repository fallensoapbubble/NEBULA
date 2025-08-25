/**
 * Portfolio Analysis API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/portfolio/analyze
 * Analyze portfolio content
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}